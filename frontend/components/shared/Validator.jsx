"use client";
import { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import {
  useWriteContract,
  useReadContract,
  useAccount,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseAbiItem, parseUnits, formatUnits } from "viem";
import { publicClient } from "@/utils/client";
import EventLogList from "@/components/shared/Events";

export default function ValidatorDashboard() {
  const [pendingTestaments, setPendingTestaments] = useState([]);
  const [checkedCount, setCheckedCount] = useState(0);
  const [rejectedRatio, setRejectedRatio] = useState("0%");
  const [stakedAmount, setStakedAmount] = useState("0");
  const [stakeInput, setStakeInput] = useState("");
  const [pendingActionHash, setPendingActionHash] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [decryptedContent, setDecryptedContent] = useState(null);
  const [decryptedFile, setDecryptedFile] = useState(null);
  const [events, setEvents] = useState([]);

  // Utilisation d'une ref pour stocker temporairement le testament sélectionné
  const currentTestamentRef = useRef(null);

  const { address } = useAccount();
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
    account: address,
    args: [address],
    watch: true,
  });

  const { isSuccess: isActionConfirmed } = useWaitForTransactionReceipt({
    hash: pendingActionHash,
  });

  useEffect(() => {
    if (userStake) {
      setStakedAmount(Number(formatUnits(userStake, 18)).toFixed(2));
    }
  }, [userStake]);

  useEffect(() => {
    const fetchLogsAndReconstructState = async () => {
      // Déstructuration de tous les logs attendus
      const [
        deposits,
        approvals,
        rejections,
        tokensStaked,
        tokensWithdrawn,
        addedToPool,
        removedFromPool,
        minStakeUpdated,
      ] = await Promise.all([
        publicClient.getLogs({
          address: testamentManagerAddress,
          event: parseAbiItem("event TestamentDeposited(address indexed _depositor, string _cid)"),
          fromBlock: 22123608n,
        }),
        publicClient.getLogs({
          address: testamentManagerAddress,
          event: parseAbiItem('event TestamentApproved(address indexed _depositor, string _cid)'),
          fromBlock: 22123608n,
        }),
        publicClient.getLogs({
          address: testamentManagerAddress,
          event: parseAbiItem('event TestamentRejected(address indexed _depositor, string _cid)'),
          fromBlock: 22123608n,
        }),
        publicClient.getLogs({
          address: validatorPoolAddress,
          event: parseAbiItem('event TokensStaked(address indexed user, uint256 amount)'),
          fromBlock: 22123608n,
        }),
        publicClient.getLogs({
          address: validatorPoolAddress,
          event: parseAbiItem('event TokensWithdrawn(address indexed user, uint256 amount)'),
          fromBlock: 22123608n,
        }),
        publicClient.getLogs({
          address: validatorPoolAddress,
          event: parseAbiItem('event AddedToPool(address indexed user)'),
          fromBlock: 22123608n,
        }),
        publicClient.getLogs({
          address: validatorPoolAddress,
          event: parseAbiItem('event RemovedFromPool(address indexed user)'),
          fromBlock: 22123608n,
        }),
        publicClient.getLogs({
          address: validatorPoolAddress,
          event: parseAbiItem('event MinStakeUpdated(uint256 newMinStake)'),
          fromBlock: 22123608n,
        }),
      ]);

      // Construction des tableaux d'événements à afficher
      const depositEvents = deposits.map((log) => ({
        type: "TestamentDeposited",
        _depositor: log.args._depositor,
        _cid: log.args._cid,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
      }));
      const approvalEvents = approvals.map((log) => ({
        type: "TestamentApproved",
        _depositor: log.args._depositor,
        _cid: log.args._cid,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
      }));
      const rejectionEvents = rejections.map((log) => ({
        type: "TestamentRejected",
        _depositor: log.args._depositor,
        _cid: log.args._cid,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
      }));

      const tokensStakedEvents = tokensStaked.map((log) => ({
        type: "TokensStaked",
        user: log.args.user,
        amount: log.args.amount,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
      }));
      const tokensWithdrawnEvents = tokensWithdrawn.map((log) => ({
        type: "TokensWithdrawn",
        user: log.args.user,
        amount: log.args.amount,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
      }));
      const addedToPoolEvents = addedToPool.map((log) => ({
        type: "AddedToPool",
        user: log.args.user,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
      }));
      const removedFromPoolEvents = removedFromPool.map((log) => ({
        type: "RemovedFromPool",
        user: log.args.user,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
      }));
      const minStakeUpdatedEvents = minStakeUpdated.map((log) => ({
        type: "MinStakeUpdated",
        newMinStake: log.args.newMinStake,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
      }));

      const allEvents = [
        ...depositEvents,
        ...approvalEvents,
        ...rejectionEvents,
        ...tokensStakedEvents,
        ...tokensWithdrawnEvents,
        ...addedToPoolEvents,
        ...removedFromPoolEvents,
        ...minStakeUpdatedEvents,
      ];
      // Tri des événements par numéro de bloc décroissant
      allEvents.sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber));
      // Mise à jour du state des events pour l'affichage
      setEvents(allEvents);

      // Logique existante pour déterminer les testaments en attente
      const approvedCIDs = new Set(approvalEvents.map((e) => e._cid));
      const rejectedCIDs = new Set(rejectionEvents.map((e) => e._cid));

      const latestByDepositor = new Map();
      deposits.forEach((log) => {
        const depositor = log.args._depositor;
        const cid = log.args._cid;
        const blockNumber = Number(log.blockNumber);
        if (!latestByDepositor.has(depositor) || latestByDepositor.get(depositor).blockNumber < blockNumber) {
          latestByDepositor.set(depositor, { cid, depositor, blockNumber });
        }
      });

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

  // Quand la transaction est confirmée, on ferme la modal et on nettoie la ref
  useEffect(() => {
    if (isActionConfirmed && isModalOpen) {
      setPendingTestaments((prev) =>
        prev.filter((t) => t.cid !== currentTestamentRef.current.cid)
      );
      currentTestamentRef.current = null;
      setDecryptedContent(null);
      setDecryptedFile(null);
      setPendingActionHash(null);
      setIsModalOpen(false);
    }
  }, [isActionConfirmed, isModalOpen]);

  const decryptFile = (encryptedData, secretKey) => {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, secretKey);
      const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
      setDecryptedFile(null);
      setDecryptedContent(decryptedData);

      if (decryptedData.startsWith("data:image/")) {
        setDecryptedFile(
          <img src={decryptedData} alt="Déchiffré" className="max-w-full rounded" />
        );
      } else if (decryptedData.startsWith("data:application/pdf")) {
        setDecryptedFile(
          <iframe
            src={decryptedData}
            title="PDF Déchiffré"
            className="w-full h-96"
          />
        );
      } else {
        setDecryptedFile(<pre className="text-sm whitespace-pre-wrap">{decryptedData}</pre>);
      }
    } catch (err) {
      console.error("Erreur de déchiffrement :", err);
      alert("Clé incorrecte ou fichier corrompu.");
    }
  };

  // On utilise directement l'objet du tableau passé en paramètre
  const decryptCID = async (testament) => {
    try {
      const keyFromChain = await publicClient.readContract({
        address: testamentManagerAddress,
        abi: testamentManagerABI,
        functionName: "getDecryptedKey",
        args: [address, testament.cid],
        account: address,
      });

      if (!keyFromChain) {
        alert("Impossible de récupérer la clé de déchiffrement");
        return;
      }

      const gateway = process.env.NEXT_PUBLIC_GATEWAY_URL;
      const res = await fetch(`https://${gateway}/ipfs/${testament.cid}`);
      const encryptedData = await res.text();

      decryptFile(encryptedData, keyFromChain);
      // Plutôt que de stocker dans l'état, on place les infos dans une ref
      currentTestamentRef.current = testament;
      setIsModalOpen(true);
    } catch (err) {
      console.error("Erreur lors du déchiffrement :", err);
      alert("Erreur de déchiffrement ou CID invalide");
    }
  };

  // Mise à jour de la fonction de décision pour appeler approveTestament ou rejectTestament
  const approveTestament = async () => {
    if (!currentTestamentRef.current) {
      alert("Aucun testament sélectionné");
      return;
    }
    try {
      const hash = writeContract({
        address: testamentManagerAddress,
        abi: testamentManagerABI,
        functionName: "approveTestament",
        args: [address, currentTestamentRef.current.depositor],
        account: address,
      });
      setPendingActionHash(hash);
    } catch (err) {
      console.error("Erreur transaction :", err);
      alert("Échec de la transaction.");
    }
  };

  const rejectTestament = async () => {
    if (!currentTestamentRef.current) {
      alert("Aucun testament sélectionné");
      return;
    }
    try {
      const hash = writeContract({
        address: testamentManagerAddress,
        abi: testamentManagerABI,
        functionName: "rejectTestament",
        args: [address, currentTestamentRef.current.depositor],
        account: address,
      });
      setPendingActionHash(hash);
    } catch (err) {
      console.error("Erreur transaction :", err);
      alert("Échec de la transaction.");
    }
  };

  const {
    data: approveData,
    writeContract: writeApprove,
  } = useWriteContract();

  const { isSuccess: isApproveTxSuccess } = useWaitForTransactionReceipt({
    hash: approveData,
  });

  const handleStake = () => {
    writeApprove({
      address: inhxAddress,
      abi: inhxABI,
      functionName: "approve",
      args: [validatorPoolAddress, parseUnits(stakeInput, 18)],
      account: address,
    });
  };

  useEffect(() => {
    if (approveData && isApproveTxSuccess) {
      writeContract({
        address: validatorPoolAddress,
        abi: validatorPoolABI,
        functionName: "stake",
        account: address,
        args: [parseUnits(stakeInput, 18)],
      });
      setStakeInput("");
    }
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
      <div>
        address {address} is authorized? {isAuthorized?.toString()}
      </div>

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
            <Button onClick={handleStake} disabled={!stakeInput}>
              Stake
            </Button>
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
              <Button onClick={handleStake} disabled={!stakeInput}>
                Stake
              </Button>
              <Button variant="destructive" onClick={handleWithdraw}>
                Withdraw
              </Button>
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
                      <Button onClick={() => decryptCID(t)}>Déchiffrer</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-auto p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Contenu du testament</h3>
            <div className="border p-3 mb-4 bg-gray-50">
              {decryptedFile || "(contenu vide ou non déchiffré)"}
            </div>
            <div className="flex justify-between">
              <Button variant="destructive" onClick={rejectTestament}>
                Rejeter
              </Button>
              <Button className="bg-green-600 hover:bg-green-700" onClick={approveTestament}>
                Approuver
              </Button>
            </div>
            <Button
              variant="ghost"
              className="mt-4 text-gray-500 hover:text-gray-700"
              onClick={() => {
                setIsModalOpen(false);
                setDecryptedFile(null);
                setDecryptedContent(null);
                currentTestamentRef.current = null;
              }}
              disabled={!!pendingActionHash}
            >
              Fermer
            </Button>
          </div>
        </div>
      )}
      {/* Section Événements */}
      <section>
        <EventLogList events={events} />
      </section>
    </div>
  );
}
