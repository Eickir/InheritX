"use client";
import Head from "next/head";
import { useState, useEffect, useRef } from "react";
import { ScrollText } from "lucide-react";
import {
  useWriteContract,
  useReadContract,
  useWaitForTransactionReceipt,
  useAccount,
} from "wagmi";
import { formatUnits } from "viem";
import EnterPool from "../sub_components/EnterPool";
import CryptoJS from "crypto-js";
import { parseAbiItem, parseUnits } from "viem";
import ValidatorMetrics from "@/components/shared/validator_dashboard/sub_components/ValidatorMetrics";
import PendingTestamentTable from "@/components/shared/validator_dashboard/sub_components/PendingTestamentTable";
import DecryptModal from "@/components/shared/validator_dashboard/sub_components/DecryptModal";
import EventLogList from "@/components/shared/Events";
import {
  testamentManagerAddress,
  testamentManagerABI,
  validatorPoolAddress,
  validatorPoolABI,
  inhxAddress,
  inhxABI,
  musdtAddress,
  musdtABI,
  poolAddress, 
  poolABI
} from "@/constants";
import { publicClient } from "@/utils/client";
import { Card, CardContent } from "@/components/ui/card";

export default function ValidatorDashboard() {
  const { address } = useAccount();
  const [authorized, setAuthorized] = useState(false);
  const [pendingTestaments, setPendingTestaments] = useState([]);
  const [checkedCount, setCheckedCount] = useState(0);
  const [rejectedRatio, setRejectedRatio] = useState("0%");
  const [stakedAmount, setStakedAmount] = useState("0");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [decryptedContent, setDecryptedContent] = useState(null);
  const [decryptedFile, setDecryptedFile] = useState(null);
  const [events, setEvents] = useState([]);
  const currentTestamentRef = useRef(null);
  const [inhxBalance, setInhxBalance] = useState(null);
  const [musdtBalance, setMusdtBalance] = useState(null);
  const [pendingActionHash, setPendingActionHash] = useState(null);
  const stakeAmountRef = useRef(null); 
  const lastBlockRef = useRef(22123608);


  const { data: userStake } = useReadContract({
    address: validatorPoolAddress,
    abi: validatorPoolABI,
    functionName: "stakes",
    args: [address],
    watch: true,
  });

  const { data: isAuthorized, refetch: refetchStatus } = useReadContract({
    address: validatorPoolAddress,
    abi: validatorPoolABI,
    functionName: "isAuthorized",
    account: address,
    args: [address],
    watch: true,
  });

  const { data: balanceINHX, refetch: refetchINHXBalance } = useReadContract({
    address: inhxAddress,
    abi: inhxABI,
    functionName: "balanceOf",
    args: [address],
    watch: true,
    account: address,
  });

  const { data: balanceMUSDT, refetch: refetchMUSDTBalance } = useReadContract({
    address: musdtAddress,
    abi: musdtABI,
    functionName: "balanceOf",
    args: [address],
    watch: true,
    account: address,
  });

  const handleSwapSuccess = async () => {
    const inhx = await refetchINHXBalance();
    const musdt = await refetchMUSDTBalance();
    setInhxBalance(inhx.data);
    setMusdtBalance(musdt.data);
    getEvents();
  };

  useEffect(() => {
    if (isAuthorized !== undefined) {
      setAuthorized(isAuthorized);
      getEvents();
    }
  }, [isAuthorized]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.__onSwapSuccessFromDashboard = handleSwapSuccess;
    }
  }, []);

  useEffect(() => {
    if (!address) return;

    const fetchData = async () => {
      const inhx = await refetchINHXBalance();
      const musdt = await refetchMUSDTBalance();
      setInhxBalance(inhx.data);
      setMusdtBalance(musdt.data);
      getEvents();
    };

    fetchData();
  }, [address]);

  const { writeContract } = useWriteContract();
  const { data: approveData, writeContract: writeApprove } = useWriteContract();
  const { data: stakeData, writeContract: writeStake } = useWriteContract();


  const {data: approveTestamentData, writeContract: writeApproveTestament} = useWriteContract(); 
  const {data: rejectTestamentData, writeContract: writeRejectTestament} = useWriteContract(); 

  const handleStake = (amount) => {
    if (!amount) return;
    stakeAmountRef.current = amount;
    writeApprove({
      address: inhxAddress,
      abi: inhxABI,
      functionName: "approve",
      args: [validatorPoolAddress, parseUnits(amount, 18)],
      account: address,
    });
  };

  const { isSuccess: isApproveTxSuccess } = useWaitForTransactionReceipt({
    hash: approveData,
  });

  useEffect(() => {
    if (approveData && isApproveTxSuccess && stakeAmountRef.current) {
      writeStake({
        address: validatorPoolAddress,
        abi: validatorPoolABI,
        functionName: "stake",
        account: address,
        args: [parseUnits(stakeAmountRef.current, 18)],
      });
      stakeAmountRef.current = null;
    }
    getEvents();
  }, [approveData, isApproveTxSuccess, writeContract]);

  const { isSuccess: isStakeConfirmed } = useWaitForTransactionReceipt({
    hash: stakeData,
  });


  useEffect(() => {
    if (isStakeConfirmed) {
      refetchStatus();
      setAuthorized(isAuthorized);
      getEvents();
    }
  }, [isStakeConfirmed]);

  const handleWithdraw = () => {
    writeContract({
      address: validatorPoolAddress,
      abi: validatorPoolABI,
      functionName: "withdraw",
      args: [],
    });
  };

  const getEvents = async () => {
    try {
      const fromBlock = BigInt(lastBlockRef.current + 1);

      const eventsToWatch = [
        {
          type: "TestamentDeposited",
          address: testamentManagerAddress,
          abi: "event TestamentDeposited(address indexed _depositor, string _cid)",
          format: (log) => ({
            type: "TestamentDeposited",
            _depositor: log.args._depositor,
            _cid: log.args._cid,
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber.toString(),
          }),
        },
        {
          type: "SwapToken",
          address: poolAddress,
          abi: "event TokenSwapped(string _tokenSent, string _tokenReceived, uint256 _balanceBeforeTokenReceived, uint256 _balanceAfterTokenReceived)",
          format: (log) => ({
            type: "SwapToken",
            _tokenSent: log.args._tokenSent,
            _tokenReceived: log.args._tokenReceived,
            _balanceBeforeTokenReceived: log.args._balanceBeforeTokenReceived,
            _balanceAfterTokenReceived: log.args._balanceAfterTokenReceived,
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber.toString(),
          }),
        },
        {
          type: "TestamentApproved",
          address: testamentManagerAddress,
          abi: "event TestamentApproved(address indexed _depositor, string _cid)",
          format: (log) => ({
            type: "TestamentApproved",
            _depositor: log.args._depositor,
            _cid: log.args._cid,
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber.toString(),
          }),
        },
        {
          type: "TestamentRejected",
          address: testamentManagerAddress,
          abi: "event TestamentRejected(address indexed _depositor, string _cid)",
          format: (log) => ({
            type: "TestamentRejected",
            _depositor: log.args._depositor,
            _cid: log.args._cid,
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber.toString(),
          }),
        },
        {
          type: "TestamentOutdated",
          address: testamentManagerAddress,
          abi: "event TestamentOutdated(address indexed _depositor, string _cid)",
          format: (log) => ({
            type: "TestamentOutdated",
            _depositor: log.args._depositor,
            _cid: log.args._cid,
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber.toString(),
          }),
        },
        {
          type: "TokensStaked",
          address: validatorPoolAddress,
          abi: "event TokensStaked(address indexed user, uint256 amount)",
          format: (log) => ({
            type: "TokensStaked",
            user: log.args.user,
            amount: log.args.amount,
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber.toString(),
          }),
        },
        {
          type: "TokensWithdrawn",
          address: validatorPoolAddress,
          abi: "event TokensWithdrawn(address indexed user, uint256 amount)",
          format: (log) => ({
            type: "TokensWithdrawn",
            user: log.args.user,
            amount: log.args.amount,
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber.toString(),
          }),
        },
        {
          type: "AddedToPool",
          address: validatorPoolAddress,
          abi: "event AddedToPool(address indexed user)",
          format: (log) => ({
            type: "AddedToPool",
            user: log.args.user,
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber.toString(),
          }),
        },
        {
          type: "RemovedFromPool",
          address: validatorPoolAddress,
          abi: "event RemovedFromPool(address indexed user)",
          format: (log) => ({
            type: "RemovedFromPool",
            user: log.args.user,
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber.toString(),
          }),
        },
        {
          type: "MinStakeUpdated",
          address: validatorPoolAddress,
          abi: "event MinStakeUpdated(uint256 newMinStake)",
          format: (log) => ({
            type: "MinStakeUpdated",
            newMinStake: log.args.newMinStake,
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber.toString(),
          }),
        },
      ];

      let allNewEvents = [];

      for (const event of eventsToWatch) {
        const logs = await publicClient.getLogs({
          address: event.address,
          event: parseAbiItem(event.abi),
          fromBlock,
          toBlock: "latest",
        });

        const formatted = logs.map(event.format);
        allNewEvents = [...allNewEvents, ...formatted];
      }

      if (allNewEvents.length > 0) {
        const maxBlock = Math.max(...allNewEvents.map((e) => Number(e.blockNumber)));
        lastBlockRef.current = maxBlock;

        setEvents((prev) => {
          const combined = [
            ...prev,
            ...allNewEvents.filter((e) => !prev.some((p) => p.transactionHash === e.transactionHash)),
          ];
          combined.sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber));
        
          // MISE À JOUR DES STATS À PARTIR DE combined (pas allNewEvents)
          const deposits = combined.filter((e) => e.type === "TestamentDeposited");
          const approvalEvents = combined.filter((e) => e.type === "TestamentApproved");
          const rejectionEvents = combined.filter((e) => e.type === "TestamentRejected");
        
          const approvedCIDs = new Set(approvalEvents.map((e) => e._cid));
          const rejectedCIDs = new Set(rejectionEvents.map((e) => e._cid));
          const latestByDepositor = new Map();
        
          deposits.forEach((log) => {
            const depositor = log._depositor;
            const cid = log._cid;
            const bn = Number(log.blockNumber);
            if (!latestByDepositor.has(depositor) || latestByDepositor.get(depositor).blockNumber < bn) {
              latestByDepositor.set(depositor, { cid, depositor, blockNumber: bn });
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
          setStakedAmount("0"); // à override avec vrai stake plus tard
        
          return combined;
        });

        const deposits = allNewEvents.filter((e) => e.type === "TestamentDeposited");
        const approvalEvents = allNewEvents.filter((e) => e.type === "TestamentApproved");
        const rejectionEvents = allNewEvents.filter((e) => e.type === "TestamentRejected");

        const approvedCIDs = new Set(approvalEvents.map((e) => e._cid));
        const rejectedCIDs = new Set(rejectionEvents.map((e) => e._cid));
        const latestByDepositor = new Map();

        deposits.forEach((log) => {
          const depositor = log._depositor;
          const cid = log._cid;
          const bn = Number(log.blockNumber);
          if (!latestByDepositor.has(depositor) || latestByDepositor.get(depositor).blockNumber < bn) {
            latestByDepositor.set(depositor, { cid, depositor, blockNumber: bn });
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
        setStakedAmount("0"); // à override avec vrai stake plus tard
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des événements:", error);
    }
  };


  const decryptFile = (encryptedData, secretKey) => {
    try {
      console.log(secretKey);
      const bytes = CryptoJS.AES.decrypt(encryptedData, secretKey);
      const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
      setDecryptedFile(null);
      setDecryptedContent(decryptedData);
      const maxStyles = {
        maxHeight: 'calc(90vh - 100px)',
        maxWidth: 'calc(90vw - 100px)',
      };
      
      if (decryptedData.startsWith("data:image/")) {
        setDecryptedFile(
          <img
            src={decryptedData}
            alt="Déchiffré"
            className="object-contain"
            style={maxStyles}
          />
        );
      } else if (decryptedData.startsWith("data:application/pdf")) {
        setDecryptedFile(
          <iframe
            src={decryptedData}
            title="PDF Déchiffré"
            className="object-contain"
            style={maxStyles}
          />
        );
      }
      
    } catch (err) {
      console.error("Erreur de déchiffrement :", err);
      alert("Clé incorrecte ou fichier corrompu.");
    }
  };

  const decryptCID = async (testament) => {
    try {
      console.log("Testament envoyé au contrat :", testament);
      const keyFromChain = await publicClient.readContract({
        address: testamentManagerAddress,
        abi: testamentManagerABI,
        functionName: "getDecryptedKey",
        args: [testament.cid],
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
      currentTestamentRef.current = testament;
      setIsModalOpen(true);
    } catch (err) {
      console.error("Erreur lors du déchiffrement :", err);
      alert("Erreur de déchiffrement ou CID invalide");
    }
  };

  const approveTestament = async () => {
    if (!currentTestamentRef.current) {
      alert("Aucun testament sélectionné");
      return;
    }
    try {
      const hash = writeApproveTestament({
        address: testamentManagerAddress,
        abi: testamentManagerABI,
        functionName: "approveTestament",
        args: [currentTestamentRef.current.depositor],
        account: address,
      });
    } catch (err) {
      console.error("Erreur transaction :", err);
      alert("Échec de la transaction.");
    }
  };

  useEffect(() => {
    if (approveTestamentData) {
      console.log("Transaction hash reçu:", approveTestamentData);
      setPendingActionHash(approveTestamentData); 
    }
  }, [approveTestamentData]);

  const rejectTestament = async () => {
    if (!currentTestamentRef.current) {
      alert("Aucun testament sélectionné");
      return;
    }
    try {
      const hash = writeRejectTestament({
        address: testamentManagerAddress,
        abi: testamentManagerABI,
        functionName: "rejectTestament",
        args: [currentTestamentRef.current.depositor],
        account: address,
      });
    } catch (err) {
      console.error("Erreur transaction :", err);
      alert("Échec de la transaction.");
    }
  };

  useEffect(() => {
    if (rejectTestamentData) {
      setPendingActionHash(rejectTestamentData);
    }
  }, [rejectTestamentData]);

  const {
    isSuccess: isApproveTestamentConfirmed,
  } = useWaitForTransactionReceipt({ hash: approveTestamentData });

  const {
    isSuccess: isRejectTestamentConfirmed,
  } = useWaitForTransactionReceipt({ hash: rejectTestamentData });

  useEffect(() => {
    if (isApproveTestamentConfirmed || isRejectTestamentConfirmed) {
      getEvents();
      setIsModalOpen(false); // Ferme le modal automatiquement après confirmation
    }
  }, [isApproveTestamentConfirmed, isRejectTestamentConfirmed]);

  const closeModal = () => {
    setIsModalOpen(false);
    setDecryptedFile(null);
    setDecryptedContent(null);
    currentTestamentRef.current = null;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {!isAuthorized ? (
        <section className="bg-white rounded-lg shadow p-4 mb-8">
          <h2 className="text-xl font-semibold mb-4">Rejoindre le réseau</h2>
          <EnterPool onStake={handleStake}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4 shadow">
                  <EnterPool.Info />
              </Card>
              <Card className="p-4 shadow">
                <CardContent>
                  <EnterPool.Action />
                </CardContent>
              </Card>
            </div>
          </EnterPool>
        </section>
      ) : (
        <>
        <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {ValidatorMetrics({
            pendingCount: pendingTestaments.length,
            checkedCount,
            rejectedRatio,
            stakedINHX: BigInt(stakedAmount || "0"),
          }).map((metric, index) => (
            <Card
              key={index}
              className="bg-white shadow-sm border border-gray-200 hover:shadow-md transition-all"
            >
              <CardContent className="p-4 flex flex-col items-center text-center space-y-2">
                <span className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                  {metric.label}
                </span>
                {metric.icon}
                <span className="text-xl font-light text-gray-700">{metric.value}</span>
              </CardContent>
            </Card>
          ))}
        </section>
          <section className="bg-white rounded-lg shadow p-4">
            <h2 className="text-xl font-semibold mb-4">Testaments en attente</h2>
            <PendingTestamentTable testaments={pendingTestaments} onDecrypt={decryptCID} />
          </section>
        </>
      )}
      {isModalOpen && (
        <DecryptModal
          file={decryptedFile}
          onApprove={approveTestament}
          onReject={rejectTestament}
          onClose={closeModal}
          pendingActionHash={pendingActionHash}
        />
      )}
      <section className="mt-8">
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardContent className="flex flex-col space-y-4 overflow-hidden h-full">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 flex items-center gap-2">
              <ScrollText className="w-5 h-5 text-blue-600" />
              Historique des événements
            </h3>

            <div
              className="overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 rounded-md"
              style={{ maxHeight: "500px", flexGrow: 1 }}
            >
              <EventLogList events={events} />
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
