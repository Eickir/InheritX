"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import CryptoJS from "crypto-js";
import { useWriteContract, useReadContract, useAccount, useWaitForTransactionReceipt } from "wagmi";
import { parseAbiItem, parseUnits, formatUnits } from "viem";
import {
  testamentManagerAddress,
  testamentManagerABI,
  validatorPoolAddress,
  validatorPoolABI,
  inhxAddress,
  inhxABI,
} from "@/constants";
import { publicClient } from "@/utils/client";

function useValidatorDashboard() {
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

  const currentTestamentRef = useRef(null);
  const { address } = useAccount();
  const { writeContract } = useWriteContract();

  // Déclaration de approveData et writeApprove pour gérer l'approbation des tokens
  const { data: approveData, writeContract: writeApprove } = useWriteContract();

  // Lecture du stake et de l'autorisation
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

  // Surveillance de la confirmation des transactions (pour approve/reject)
  const { isSuccess: isActionConfirmed } = useWaitForTransactionReceipt({
    hash: pendingActionHash,
  });

  // Fonction de rafraîchissement des données (extraite de fetchLogsAndReconstructState)
  const refreshValidatorData = useCallback(async () => {
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
        fromBlock: 22187326n,
      }),
      publicClient.getLogs({
        address: testamentManagerAddress,
        event: parseAbiItem("event TestamentApproved(address indexed _depositor, string _cid)"),
        fromBlock: 22187326n,
      }),
      publicClient.getLogs({
        address: testamentManagerAddress,
        event: parseAbiItem("event TestamentRejected(address indexed _depositor, string _cid)"),
        fromBlock: 22187326n,
      }),
      publicClient.getLogs({
        address: validatorPoolAddress,
        event: parseAbiItem("event TokensStaked(address indexed user, uint256 amount)"),
        fromBlock: 22187326n,
      }),
      publicClient.getLogs({
        address: validatorPoolAddress,
        event: parseAbiItem("event TokensWithdrawn(address indexed user, uint256 amount)"),
        fromBlock: 22187326n,
      }),
      publicClient.getLogs({
        address: validatorPoolAddress,
        event: parseAbiItem("event AddedToPool(address indexed user)"),
        fromBlock: 22187326n,
      }),
      publicClient.getLogs({
        address: validatorPoolAddress,
        event: parseAbiItem("event RemovedFromPool(address indexed user)"),
        fromBlock: 22187326n,
      }),
      publicClient.getLogs({
        address: validatorPoolAddress,
        event: parseAbiItem("event MinStakeUpdated(uint256 newMinStake)"),
        fromBlock: 22187326n,
      }),
    ]);

    // Construction des événements pour affichage
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
    allEvents.sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber));
    setEvents(allEvents);

    // Reconstruction de la liste des testaments en attente
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
  }, []);

  // On exécute refreshValidatorData au montage
  useEffect(() => {
    refreshValidatorData();
  }, [refreshValidatorData]);

  // Fermeture automatique de la modal une fois l'action confirmée
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

  // Fonction de déchiffrement du fichier
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
          <iframe src={decryptedData} title="PDF Déchiffré" className="w-full h-96" />
        );
      } else {
        setDecryptedFile(<pre className="text-sm whitespace-pre-wrap">{decryptedData}</pre>);
      }
    } catch (err) {
      console.error("Erreur de déchiffrement :", err);
      alert("Clé incorrecte ou fichier corrompu.");
    }
  };

  // Déchiffrement à partir du CID
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
      currentTestamentRef.current = testament;
      setIsModalOpen(true);
    } catch (err) {
      console.error("Erreur lors du déchiffrement :", err);
      alert("Erreur de déchiffrement ou CID invalide");
    }
  };

  // Approbation du testament
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

  // Rejet du testament
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

  const closeModal = () => {
    setIsModalOpen(false);
    setDecryptedFile(null);
    setDecryptedContent(null);
    currentTestamentRef.current = null;
  };

  // Fonction de staking
// Fonction de staking
const handleStake = (amount) => {
  // Met à jour l'état global stakeInput avec le montant saisi
  setStakeInput(amount);

  // Lance la transaction d'approbation pour le montant indiqué
  writeApprove({
    address: inhxAddress,
    abi: inhxABI,
    functionName: "approve",
    args: [validatorPoolAddress, parseUnits(amount, 18)],
    account: address,
  });
};


  // Une fois l'approbation effectuée, on lance le staking et on réactualise les données
  const { isSuccess: isApproveTxSuccess } = useWaitForTransactionReceipt({
    hash: approveData,
  });

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
      refreshValidatorData();
    }
  }, [approveData, isApproveTxSuccess, stakeInput, writeContract, refreshValidatorData]);

  const handleWithdraw = () => {
    writeContract({
      address: validatorPoolAddress,
      abi: validatorPoolABI,
      functionName: "withdraw",
      args: [],
    });
    refreshValidatorData();
  };

  return {
    address,
    isAuthorized,
    stakeInput,
    setStakeInput,
    stakedAmount,
    pendingTestaments,
    checkedCount,
    rejectedRatio,
    isModalOpen,
    decryptedFile,
    decryptCID,
    approveTestament,
    rejectTestament,
    closeModal,
    handleStake,
    handleWithdraw,
    events,
    pendingActionHash,
  };
}

export default useValidatorDashboard;
