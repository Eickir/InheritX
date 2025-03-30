"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, CheckCircle, XCircle, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import CryptoJS from "crypto-js";
import {
  testamentManagerAddress,
  testamentManagerABI,
  validatorPoolAddress,
  validatorPoolABI,
  inhxAddress,
  inhxABI,
} from "@/constants";
import { useWriteContract, useReadContract, useAccount, useWaitForTransactionReceipt } from "wagmi";
import { parseAbiItem, parseUnits, formatUnits } from "viem";
import { publicClient } from "@/utils/client";

export default function ValidatorDashboard() {
  const [pendingTestaments, setPendingTestaments] = useState([]);
  const [checkedCount, setCheckedCount] = useState(0);
  const [rejectedRatio, setRejectedRatio] = useState("0%");
  const [stakedAmount, setStakedAmount] = useState("0");
  const [selectedCID, setSelectedCID] = useState(null);
  const [decryptedContent, setDecryptedContent] = useState(null);
  const [stakeInput, setStakeInput] = useState("");

  const { address, isConnected } = useAccount();
  const { writeContract } = useWriteContract();

  const { data: userStake } = useReadContract({
    address: validatorPoolAddress,
    abi: validatorPoolABI,
    functionName: "stakes",
    args: [address],
    watch: true,
  });

  const { data: isAuthorized } = useReadContract({
    address: validatorPoolAddress,
    abi: validatorPoolABI,
    functionName: "isAuthorized",
    args: [address],
    account: address,
    watch: true,
  });

  useEffect(() => {
    if (userStake) {
      setStakedAmount(Number(formatUnits(userStake, 18)).toFixed(2));
    }
  }, [userStake]);

  useEffect(() => {
    const fetchLogsAndReconstructState = async () => {
      const [deposits, approvals, rejections] = await Promise.all([
        publicClient.getLogs({
          address: testamentManagerAddress,
          event: parseAbiItem("event TestamentDeposited(address indexed _depositor, string _cid)"),
          fromBlock: 22123608n,
        }),
        publicClient.getLogs({
          address: testamentManagerAddress,
          event: parseAbiItem("event TestamentApproved(string _cid)"),
          fromBlock: 22123608n,
        }),
        publicClient.getLogs({
          address: testamentManagerAddress,
          event: parseAbiItem("event TestamentRejected(string _cid)"),
          fromBlock: 22123608n,
        }),
      ]);

      const approvedCIDs = new Set(approvals.map((log) => log.args._cid));
      const rejectedCIDs = new Set(rejections.map((log) => log.args._cid));

      const latestByDepositor = new Map();

      for (const log of deposits) {
        const depositor = log.args._depositor;
        const cid = log.args._cid;
        const blockNumber = Number(log.blockNumber);

        if (!latestByDepositor.has(depositor) || latestByDepositor.get(depositor).blockNumber < blockNumber) {
          latestByDepositor.set(depositor, { cid, depositor, blockNumber });
        }
      }

      const pending = Array.from(latestByDepositor.values()).filter(
        (t) => !approvedCIDs.has(t.cid) && !rejectedCIDs.has(t.cid)
      );

      setPendingTestaments(pending);
      setCheckedCount(approvedCIDs.size + rejectedCIDs.size);
      setRejectedRatio(
        approvedCIDs.size + rejectedCIDs.size > 0
          ? `${Math.round((rejectedCIDs.size / (approvedCIDs.size + rejectedCIDs.size)) * 100)}%`
          : "0%"
      );
    };

    fetchLogsAndReconstructState();
  }, []);

  const decryptCID = async (cid) => {
    const key = prompt("Entrez la clé de déchiffrement :");
    if (!key) return;
    try {
      const gateway = process.env.NEXT_PUBLIC_GATEWAY_URL;
      const res = await fetch(`https://${gateway}/ipfs/${cid}`);
      const encryptedData = await res.text();
      const bytes = CryptoJS.AES.decrypt(encryptedData, key);
      const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
      setDecryptedContent(decryptedData);
      setSelectedCID(cid);
    } catch (err) {
      alert("Erreur de déchiffrement ou CID invalide");
    }
  };

    // Approbation du transfert de tokens
    const {
      data: approveData,
      error: approveError,
      isError: isApproveError,
      isLoading: isApproveLoading,
      writeContract: writeApprove,
    } = useWriteContract();
    const {
      isPending: isApprovePending,
      isSuccess: isApproveTxSuccess,
      isError: isApproveTxError,
    } = useWaitForTransactionReceipt({
      hash: approveData,
    });

  const handleDecision = (cid, approve) => {
    writeContract({
      address: testamentManagerAddress,
      abi: testamentManagerABI,
      functionName: approve ? "approveTestament" : "rejectTestament",
      args: [cid],
    });
    setPendingTestaments(pendingTestaments.filter((t) => t.cid !== cid));
    setDecryptedContent(null);
    setSelectedCID(null);
  };

  const handleStake = () => {

    writeApprove({
      address: inhxAddress,
      abi: inhxABI,
      functionName: "approve",
      args: [validatorPoolAddress, parseUnits(stakeInput, 18)],
      account: address,
    });
        
      }  

  // Déclenchement du dépôt après approbation
  useEffect(() => {
    if (approveData && isApproveTxSuccess) {
      writeContract({
        address: validatorPoolAddress,
        abi: validatorPoolABI,
        functionName: "stake",
        args: [parseUnits(stakeInput, 18)],
      });
      setStakeInput("");
    };
  }, [approveData, isApproveTxSuccess, address, writeContract]);


  const handleWithdraw = () => {
    writeContract({
      address: validatorPoolAddress,
      abi: validatorPoolABI,
      functionName: "withdraw",
      args: [],
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <h1 className="text-2xl font-bold mb-6">Tableau de bord du Validateur</h1>
      <div>{isAuthorized?.toString()}</div>
      {!isAuthorized ? (
        <section className="bg-white rounded-lg shadow p-4 mb-8">
          <h2 className="text-xl font-semibold mb-4">Rejoindre le réseau</h2>
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <Input
              placeholder="Montant à staker"
              value={stakeInput}
              onChange={(e) => setStakeInput(e.target.value)}
              className="w-full md:w-1/3"
            />
            <Button onClick={handleStake} disabled={!stakeInput}>Stake</Button>
          </div>
        </section>
      ) : (
        <>
          <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="flex flex-col items-center">
                <span className="text-sm text-gray-600">Testaments en attente</span>
                <span className="text-2xl font-bold">{pendingTestaments.length}</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center">
                <span className="text-sm text-gray-600">Testaments checkés</span>
                <span className="text-2xl font-bold">{checkedCount}</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center">
                <span className="text-sm text-gray-600">% refusés</span>
                <span className="text-2xl font-bold">{rejectedRatio}</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center">
                <span className="text-sm text-gray-600">Jetons stakés</span>
                <span className="text-2xl font-bold">{stakedAmount} INHX</span>
              </CardContent>
            </Card>
          </section>

          <section className="bg-white rounded-lg shadow p-4 mb-8">
            <h2 className="text-xl font-semibold mb-4">Staking</h2>
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <Input
                placeholder="Montant à staker"
                value={stakeInput}
                onChange={(e) => setStakeInput(e.target.value)}
                className="w-full md:w-1/3"
              />
              <Button onClick={handleStake} disabled={!stakeInput}>Stake</Button>
              <Button variant="destructive" onClick={handleWithdraw}>Withdraw</Button>
            </div>
          </section>

          <section className="bg-white rounded-lg shadow p-4">
            <h2 className="text-xl font-semibold mb-4">Testaments en attente</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2">Adresse</th>
                  <th className="py-2">CID</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingTestaments.map((t) => (
                  <tr key={`${t.cid}-${t.blockNumber}`} className="border-b">
                    <td className="py-2 break-all">{t.depositor}</td>
                    <td className="py-2 break-all">{t.cid}</td>
                    <td className="py-2 text-right">
                      <Button onClick={() => decryptCID(t.cid)}>Déchiffrer</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}

      {selectedCID && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white w-full max-w-xl p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Contenu du testament</h3>
            <div className="border p-3 mb-4 text-sm bg-gray-50 whitespace-pre-wrap">
              {decryptedContent || "(vide)"}
            </div>
            <div className="flex justify-between">
              <Button variant="destructive" onClick={() => handleDecision(selectedCID, false)}>
                Rejeter
              </Button>
              <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleDecision(selectedCID, true)}>
                Approuver
              </Button>
            </div>
            <Button
              variant="ghost"
              className="mt-4 text-gray-500 hover:text-gray-700"
              onClick={() => setSelectedCID(null)}
            >
              Fermer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
