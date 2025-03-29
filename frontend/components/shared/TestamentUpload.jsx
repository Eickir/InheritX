"use client";
import Head from "next/head";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation"; // Hook pour Next.js 13
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);
import {
  Loader2,
  CheckCircle,
  XCircle,
  PartyPopper,
  FileText,
  Calendar,
  Info,
  Wallet,
} from "lucide-react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from "wagmi";
import CryptoJS from "crypto-js";
import {
  testamentManagerABI,
  testamentManagerAddress,
  inhxAddress,
  inhxABI,
  musdtAddress,
  musdtABI,
  poolAddress,
  poolABI,
} from "@/constants";
import { parseUnits, formatUnits } from "viem";
import { publicClient } from "@/utils/client";
import { parseAbiItem } from "viem";
import EventLogList from "@/components/shared/Events";

const depositAmount = "100"; // 100 INHX

// Fonction utilitaire pour déterminer le statut de la transaction
function getTransactionStatus({ isWriteError, isPending, isError, isSuccess }) {
  if (isWriteError) {
    return {
      type: "error",
      text: "Échec local : transaction rejetée ou revert avant broadcast.",
    };
  }
  if (isPending) {
    return {
      type: "pending",
      text: "Transaction en attente de confirmation sur la blockchain...",
    };
  }
  if (isError) {
    return {
      type: "error",
      text: "La transaction a échoué ou a revert on-chain.",
    };
  }
  if (isSuccess) {
    return {
      type: "success",
      text: "Transaction confirmée avec succès ! Testament enregistré.",
    };
  }
  return null;
}

function StatusAlert({ status }) {
  if (!status) return null;
  let containerClass = "flex items-center gap-2 border-l-4 p-4 mt-4";
  let icon = null;
  switch (status.type) {
    case "pending":
      containerClass += " border-yellow-500 bg-yellow-50";
      icon = <Loader2 className="text-yellow-600 w-6 h-6 animate-spin" />;
      break;
    case "success":
      containerClass += " border-green-500 bg-green-50";
      icon = <PartyPopper className="text-green-500 w-6 h-6" />;
      break;
    case "error":
      containerClass += " border-red-500 bg-red-50";
      icon = <XCircle className="text-red-500 w-6 h-6" />;
      break;
    default:
      break;
  }
  return (
    <div className={containerClass}>
      {icon}
      <p className="text-sm">{status.text}</p>
    </div>
  );
}

// Composant pour afficher un graphique circulaire du pourcentage staké
function CircularProgress({ percentage }) {
  const radius = 40;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  return (
    <svg height={radius * 2} width={radius * 2}>
      <circle
        stroke="#e5e7eb"
        fill="transparent"
        strokeWidth={stroke}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />
      <circle
        stroke="#3b82f6"
        fill="transparent"
        strokeWidth={stroke}
        strokeLinecap="round"
        style={{
          transition: "stroke-dashoffset 0.35s",
          transform: "rotate(-90deg)",
          transformOrigin: "50% 50%",
        }}
        strokeDasharray={circumference + " " + circumference}
        strokeDashoffset={strokeDashoffset}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        className="text-sm font-bold fill-current text-gray-800"
      >
        {percentage}%
      </text>
    </svg>
  );
}

export default function DashboardTestament({my_events}) {
  const { address, isConnected } = useAccount();
  const router = useRouter();

  // Lecture des données avec mise à jour automatique
  const { data: balanceINHX, refetch: refetchINHXBalance  } = useReadContract({
    address: inhxAddress,
    abi: inhxABI,
    functionName: "balanceOf",
    args: [address],
    account: address,
    watch: true,
  });

  const { data: balanceMUSDT, refetch: refetchMUSDTBalance } = useReadContract({
    address: musdtAddress,
    abi: musdtABI,
    functionName: "balanceOf",
    args: [address],
    account: address,
    watch: true,
  });
  const { data: TestamentInfo , refetch: refetchTestamentInfo} = useReadContract({
    address: testamentManagerAddress,
    abi: testamentManagerABI,
    functionName: "getTestament",
    args: [address],
    account: address,
    watch: true,
  });

  const { data: TestamentCount , refetch: refetchTestamentCount} = useReadContract({
    address: testamentManagerAddress,
    abi: testamentManagerABI,
    functionName: "getTestamentsNumber",
    args: [address],
    account: address,
    watch: true,
  });


  // Pour traduire le statut numérique du testament
  const statusMapping = {
    0: "Pending",
    1: "Accepted",
    2: "Rejected",
  };

  // Variable pour le nombre de testaments déposés
  useEffect(() => {
    if (typeof isConnected === "boolean" && !isConnected) {
      router.push("/login");
    }
  }, [isConnected, router]);

  // Transaction de dépôt
  const {
    data: writeData,
    error: writeError,
    isError: isWriteError,
    isLoading: isWriteLoading,
    isSuccess: isWriteSuccess,
    writeContract,
  } = useWriteContract();
  const { isPending, isSuccess, isError } = useWaitForTransactionReceipt({
    hash: writeData,
  });

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

  // Effet pour stopper le loader en cas d'échec de l'approbation
  useEffect(() => {
    if (isApproveTxError) {
      setUploading(false);
      setProgress((prev) => ({
        ...prev,
        approvalDone: false,
        contractStarted: false,
        contractDone: false,
      }));
    }
  }, [isApproveTxError]);

  // États pour le processus de dépôt
  const [file, setFile] = useState(null);
  const [cid, setCid] = useState("");
  const [decryptedFile, setDecryptedFile] = useState(null);
  const [encryptionKey, setEncryptionKey] = useState("");
  const [showSteps, setShowSteps] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({
    encryptionStarted: false,
    encryptionDone: false,
    ipfsStarted: false,
    ipfsDone: false,
    approvalStarted: false,
    approvalDone: false,
    contractStarted: false,
    contractDone: false,
  });
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  // États pour les logs d'événements
  const [events, setEvents] = useState([]);
  const getEvents = async () => {
    const TestamentDepositedLogs = await publicClient.getLogs({
      address: testamentManagerAddress,
      event: parseAbiItem(
        "event TestamentDeposited(address indexed _depositor, string _cid)"
      ),
      fromBlock: 22123608n,
    });
    const SwapLogs = await publicClient.getLogs({
      address: poolAddress,
      event: parseAbiItem(
        "event TokenSwapped(string _tokenSent, string _tokenReceived, uint256 _balanceBeforeTokenReceived, uint256 _balanceAfterTokenReceived)"
      ),
      fromBlock: 22123608n,
    });
    const formattedTestamentDepositedLogs = TestamentDepositedLogs.map((log) => ({
      type: "TestamentDeposited",
      _depositor: log.args._depositor,
      transactionHash: log.transactionHash,
      blockNumber: log.blockNumber.toString(),
    }));
    const formattedSwapLogs = SwapLogs.map((log) => ({
      type: "SwapToken",
      _tokenSent: log.args._tokenSent,
      _tokenReceived: log.args._tokenReceived,
      _balanceBeforeTokenReceived: log.args._balanceBeforeTokenReceived,
      _balanceAfterTokenReceived: log.args._balanceAfterTokenReceived,
      transactionHash: log.transactionHash,
      blockNumber: log.blockNumber.toString(),
    }));
    const combinedEvents = [
      ...formattedTestamentDepositedLogs,
      ...formattedSwapLogs,
    ].sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber));
    setEvents(combinedEvents);
  };

  useEffect(() => {
    const getAllEvents = async () => {
      await getEvents();
  }
    getAllEvents()
    refetchINHXBalance();
    refetchMUSDTBalance();
    refetchTestamentInfo();
    refetchTestamentCount();
  }, [isWriteSuccess]);

  // Fonctions de chiffrement/déchiffrement
  const generateEncryptionKey = () =>
    CryptoJS.lib.WordArray.random(32).toString();
  const readFileAsDataURL = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  const encryptFile = async (file, secretKey) => {
    const fileData = await readFileAsDataURL(file);
    return CryptoJS.AES.encrypt(fileData, secretKey).toString();
  };
  const decryptFile = (encryptedData, secretKey) => {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, secretKey);
      const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
      setDecryptedFile(null);
      if (decryptedData.startsWith("data:image/")) {
        setDecryptedFile(
          <img src={decryptedData} alt="Déchiffré" className="max-w-full" />
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
        setDecryptedFile(<pre className="text-sm">{decryptedData}</pre>);
      }
    } catch (err) {
      console.error("Erreur de déchiffrement :", err);
      alert("Clé incorrecte ou fichier corrompu.");
    }
  };

  // Processus pour déposer le testament
  const handleDepositTestament = async () => {
    if (!file) return;
    try {
      setShowSteps(true);
      setCid("");
      setDecryptedFile(null);
      setProgress({
        encryptionStarted: false,
        encryptionDone: false,
        ipfsStarted: false,
        ipfsDone: false,
        approvalStarted: false,
        approvalDone: false,
        contractStarted: false,
        contractDone: false,
      });
      setUploading(true);
      const secretKey = generateEncryptionKey();
      setEncryptionKey(secretKey);
      // Étape 1 : Chiffrement du fichier
      setProgress((p) => ({ ...p, encryptionStarted: true }));
      const encryptedData = await encryptFile(file, secretKey);
      setProgress((p) => ({ ...p, encryptionDone: true }));
      // Étape 2 : Dépôt sur IPFS
      setProgress((p) => ({ ...p, ipfsStarted: true }));
      const formData = new FormData();
      formData.append(
        "file",
        new Blob([encryptedData], { type: "text/plain" }),
        "encrypted.txt"
      );
      const res = await fetch("/api/files", { method: "POST", body: formData });
      const resData = await res.json();
      setCid(resData.cid);
      setProgress((p) => ({ ...p, ipfsDone: true }));
      // Étape 3 : Approbation du transfert de tokens
      setProgress((p) => ({ ...p, approvalStarted: true }));
      writeApprove({
        address: inhxAddress,
        abi: inhxABI,
        functionName: "approve",
        args: [testamentManagerAddress, parseUnits(depositAmount, 18)],
        account: address,
      });
    } catch (err) {
      console.error("Erreur dans le processus:", err);
      alert("Échec lors du chiffrement ou du dépôt sur IPFS.");
      setUploading(false);
    }
  };

  // Déclenchement du dépôt après approbation
  useEffect(() => {
    if (approveData && isApproveTxSuccess) {
      setProgress((p) => ({ ...p, approvalDone: true, contractStarted: true }));
      writeContract({
        address: testamentManagerAddress,
        abi: testamentManagerABI,
        functionName: "depositTestament",
        args: [cid, encryptionKey, parseUnits(depositAmount, 18)],
        account: address,
      });
    }
  }, [approveData, isApproveTxSuccess, cid, encryptionKey, address, writeContract]);

  // Une fois la transaction confirmée, on arrête le chargement et on rafraîchit les événements
  useEffect(() => {
    if (isSuccess) {
      setProgress((p) => ({ ...p, contractDone: true }));
      setUploading(false);
      getEvents();
    }
  }, [isSuccess]);

  const handleChangeFile = (e) => setFile(e.target.files[0]);

  const status = getTransactionStatus({
    isWriteError,
    isPending,
    isError,
    isSuccess,
  });
  const contractHasError = isWriteError || isError;

  const retrieveAndDecryptFile = async () => {
    if (!cid) return alert("Aucun CID disponible.");
    try {
      const key = prompt("Entrez la clé de déchiffrement :");
      if (!key) return;
      const gateway = process.env.NEXT_PUBLIC_GATEWAY_URL;
      if (!gateway) {
        alert("Configuration manquante pour accéder à IPFS.");
        return;
      }
      const res = await fetch(`https://${gateway}/ipfs/${cid}`);
      const encryptedData = await res.text();
      decryptFile(encryptedData, key.trim());
    } catch (err) {
      console.error("Erreur récupération fichier :", err);
      alert("Erreur lors de la récupération.");
    }
  };

  // Formatage des soldes avec deux décimales
  const formattedBalanceINHX = balanceINHX
    ? Number(formatUnits(balanceINHX, 18)).toFixed(2)
    : "0";
  const formattedBalanceMUSDT = balanceMUSDT
    ? Number(formatUnits(balanceMUSDT, 18)).toFixed(2)
    : "0";

  return (
    <>
      <Head>
        <title>Tableau de Bord - Testateur</title>
        <meta
          name="description"
          content="Dashboard complet pour gérer votre testament sur la blockchain"
        />
      </Head>
      <div className="flex min-h-screen bg-gray-50">
        {/* Menu latéral */}
        <div
          className={`bg-white shadow transition-all duration-300 ${sidebarExpanded ? "w-64" : "w-20"}`}
          onMouseEnter={() => setSidebarExpanded(true)}
          onMouseLeave={() => setSidebarExpanded(false)}
        >
          <div className="h-screen flex flex-col p-4">
            <div className="flex items-center mb-8">
              <Wallet className="w-6 h-6 text-blue-600" />
              {sidebarExpanded && (
                <span className="ml-2 font-bold text-lg">Menu</span>
              )}
            </div>
            <nav className="flex-1">
              <ul className="space-y-4">
                <li className="flex items-center gap-2 cursor-pointer hover:text-blue-600">
                  <FileText className="w-5 h-5" />
                  {sidebarExpanded && <span>Dashboard</span>}
                </li>
                <li className="flex items-center gap-2 cursor-pointer hover:text-blue-600">
                  <FileText className="w-5 h-5" />
                  {sidebarExpanded && <span>Mon Testament</span>}
                </li>
                <li className="flex items-center gap-2 cursor-pointer hover:text-blue-600">
                  <Wallet className="w-5 h-5" />
                  {sidebarExpanded && <span>Mes Soldes</span>}
                </li>
                <li className="flex items-center gap-2 cursor-pointer hover:text-blue-600">
                  <Info className="w-5 h-5" />
                  {sidebarExpanded && <span>Mes Stakings</span>}
                </li>
              </ul>
            </nav>
          </div>
        </div>
        {/* Contenu principal */}
        <div className="flex-1">
          {/* En-tête */}
          <header className="bg-white shadow px-4 py-6 flex justify-between items-center">
            <h1 className="text-3xl font-bold">Tableau de Bord du Testateur</h1>
            <div className="flex items-center gap-4">
              <Wallet className="w-6 h-6 text-blue-600" />
              <span>
                {address
                  ? address.substring(0, 6) +
                    "..." +
                    address.substring(address.length - 4)
                  : "Non connecté"}
              </span>
            </div>
          </header>
          {/* Contenu */}
          <main className="p-4 space-y-8">
            {/* Résumé des métriques */}
            <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="flex flex-col items-center">
                  <span className="text-sm text-gray-600">Testaments déposés</span>
                  <span className="text-2xl font-bold">{TestamentCount ? TestamentCount : "0"}</span>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex flex-col items-center">
                  <span className="text-sm text-gray-600">Statut du dernier testament</span>
                  <span className="text-2xl font-bold">
                    {TestamentInfo && TestamentInfo.cid !== ""
                      ? statusMapping[TestamentInfo.status] || TestamentInfo.status
                      : "-"}
                  </span>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex flex-col items-center">
                  <span className="text-sm text-gray-600">Tokens INHX disponibles</span>
                  <span className="text-2xl font-bold">{formattedBalanceINHX}</span>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex flex-col items-center">
                  <span className="text-sm text-gray-600">Tokens MUSDT disponibles</span>
                  <span className="text-2xl font-bold">{formattedBalanceMUSDT}</span>
                </CardContent>
              </Card>
            </section>
            {/* Section Actions */}
            <section className="space-y-8">
            <Card className="bg-white shadow">
            <CardContent className="flex flex-col md:flex-row">
              {/* Bloc 1 : Déposer un testament */}
              <div className="md:w-1/3 p-4">
                <h3 className="text-lg font-semibold mb-2">Déposer un Testament</h3>
                <Input type="file" onChange={handleChangeFile} className="mb-2" />
                <Button onClick={handleDepositTestament} disabled={!file || uploading || !isConnected} className="mb-4">
                  {uploading ? "Envoi en cours..." : `Déposer pour ${depositAmount} INHX`}
                </Button>
                {showSteps && (
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      {progress.encryptionStarted ? (
                        progress.encryptionDone ? <CheckCircle className="text-green-500 w-4 h-4" /> :
                        <Loader2 className="text-gray-400 w-4 h-4 animate-spin" />
                      ) : null}
                      Chiffrement du fichier
                    </li>
                    <li className="flex items-center gap-2">
                      {progress.ipfsStarted ? (
                        progress.ipfsDone ? <CheckCircle className="text-green-500 w-4 h-4" /> :
                        <Loader2 className="text-gray-400 w-4 h-4 animate-spin" />
                      ) : null}
                      Dépôt sur IPFS
                    </li>
                    <li className="flex items-center gap-2">
                      {progress.approvalStarted ? (
                        isApproveTxSuccess ? <CheckCircle className="text-green-500 w-4 h-4" /> :
                        isApproveLoading || isApprovePending ? <Loader2 className="text-gray-400 w-4 h-4 animate-spin" /> :
                        <XCircle className="text-red-500 w-4 h-4" />
                      ) : null}
                      Approbation du transfert
                    </li>
                    <li className="flex items-center gap-2">
                      {progress.contractStarted ? (
                        contractHasError ? <XCircle className="text-red-500 w-4 h-4" /> :
                        progress.contractDone ? <CheckCircle className="text-green-500 w-4 h-4" /> :
                        <Loader2 className="text-gray-400 w-4 h-4 animate-spin" />
                      ) : null}
                      Dépôt sur le smart contract
                    </li>
                  </ul>
                )}
              </div>

              {/* Bloc 2 : Dernier testament */}
              <div className="md:w-1/3 p-4 md:border-l md:border-gray-200 md:pl-6">
                <h3 className="text-lg font-semibold mb-2">Dernier Testament</h3>
                {TestamentInfo && TestamentInfo.cid !== "" ? (
                  <div className="space-y-1 text-sm">
                    <p>
                      <strong>CID :</strong> <span className="break-all">{TestamentInfo.cid}</span>
                    </p>
                    <p>
                      <strong>Statut :</strong> {statusMapping[TestamentInfo.status] || TestamentInfo.status}
                    </p>
                    <p>
                      <strong>Déposé le :</strong>{" "}
                      {dayjs.unix(Number(TestamentInfo.depositTimestamp)).utc().format("YYYY-MM-DD HH:mm:ss")}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Aucun testament enregistré.</p>
                )}
              </div>

              {/* Bloc 3 : Déchiffrement */}
              <div className="md:w-1/3 p-4 md:border-l md:border-gray-200 md:pl-6">
                <h3 className="text-lg font-semibold mb-2">Déchiffrer un testament</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Entrez la clé de déchiffrement pour consulter le contenu.
                </p>
                <Button onClick={retrieveAndDecryptFile}>Déchiffrer</Button>
                {decryptedFile && (
                  <div className="mt-4 border rounded bg-gray-50 p-2">
                    <h4 className="text-sm font-semibold mb-2">Contenu Déchiffré :</h4>
                    {decryptedFile}
                  </div>
                )}
              </div>
            </CardContent>
            </Card>

            </section>
            {/* Section Événements */}
            <section>
              <EventLogList events={events} />
            </section>
          </main>
        </div>
      </div>
    </>
  );
}
