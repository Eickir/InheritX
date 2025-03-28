"use client";
import Head from "next/head";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { XCircle, Loader2, CheckCircle, PartyPopper } from "lucide-react";
import CryptoJS from "crypto-js";
import { FileText, Lock, Calendar, Info } from "lucide-react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from "wagmi";
import {
  testamentManagerABI,
  testamentManagerAddress,
  inhxAddress,
  inhxABI,
  musdtAddress,
  musdtABI,
} from "@/constants";
import { parseAbiItem } from "viem";
import { publicClient } from "@/utils/client";
import { parseUnits, formatUnits } from "viem";

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

export default function DashboardTestament({ getEvents }) {
  const { address, isConnected } = useAccount();

  // Récupération des soldes et informations du testament via les hooks Wagmi
  const { data: balanceINHX } = useReadContract({
    address: inhxAddress,
    abi: inhxABI,
    functionName: "balanceOf",
    args: [address],
    account: address,
  });

  const { data: balanceMUSDT } = useReadContract({
    address: musdtAddress,
    abi: musdtABI,
    functionName: "balanceOf",
    args: [address],
    account: address,
  });

  const { data: TestamentInfo } = useReadContract({
    address: testamentManagerAddress,
    abi: testamentManagerABI,
    functionName: "getTestament",
    args: [address],
    account: address,
  });

  // Hooks pour la transaction de dépôt sur le smart contract
  const {
    data: writeData,
    error: writeError,
    isError: isWriteError,
    isLoading: isWriteLoading,
    isSuccess: isWriteSuccess,
    writeContract,
  } = useWriteContract();

  const {
    isPending,
    isSuccess,
    isError,
  } = useWaitForTransactionReceipt({ hash: writeData });

  // Hooks pour l'approbation du transfert de tokens
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
  } = useWaitForTransactionReceipt({ hash: approveData });

  // États locaux pour la gestion des fichiers et du processus
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
        setDecryptedFile(<img src={decryptedData} alt="Déchiffré" />);
      } else if (decryptedData.startsWith("data:application/pdf")) {
        setDecryptedFile(
          <iframe
            src={decryptedData}
            title="PDF Déchiffré"
            width="100%"
            height="500px"
          />
        );
      } else {
        setDecryptedFile(<pre>{decryptedData}</pre>);
      }
    } catch (err) {
      console.error("Erreur de déchiffrement :", err);
      alert("Clé incorrecte ou fichier corrompu.");
    }
  };

  // Processus global pour déposer le testament
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
      // Le dépôt sur le smart contract sera déclenché dans le useEffect suivant
    } catch (err) {
      console.error("Erreur globale dans le processus:", err);
      alert("Échec lors du chiffrement ou du dépôt sur IPFS.");
      setUploading(false);
    }
  };

  // useEffect pour déclencher le dépôt une fois l'approbation confirmée
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

  // Mise à jour du statut du dépôt sur le smart contract
  useEffect(() => {
    if (isSuccess) {
      setProgress((p) => ({ ...p, contractDone: true }));
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

  useEffect(() => {
    if (isSuccess) {
      getEvents();
    }
  }, [isSuccess, getEvents]);

  return (
    <>
      <Head>
        <title>Dashboard Testament - Web3</title>
        <meta
          name="description"
          content="Tableau de bord pour gérer et déposer votre testament sur la blockchain Web3"
        />
      </Head>
      <main className="min-h-screen bg-gray-50 p-6">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-center">
            Tableau de Bord du Testateur
          </h1>
        </header>
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Colonne de gauche : Informations & Soldes */}
          <section>
            <Card className="mb-6">
              <CardContent>
                <div className="flex items-center mb-4">
                  <FileText className="w-10 h-10 text-blue-600 mr-3" />
                  <h2 className="text-2xl font-bold text-gray-900">
                    Dernier Testament
                  </h2>
                </div>
                <p className="text-gray-700 text-sm mb-2">
                  <strong>Testament CID :</strong>{" "}
                  <span className="break-all">{TestamentInfo?.cid}</span>
                </p>
                <p className="text-gray-700 text-sm mb-2">
                  <strong>Clé de déchiffrement :</strong>{" "}
                  <span className="break-all">{TestamentInfo?.decryptionKey}</span>
                </p>
                <div className="flex justify-between text-sm text-gray-600">
                  <div className="flex items-center">
                    <Calendar className="w-5 h-5 mr-1" />
                    <span>
                      <strong>Déposé le :</strong>{" "}
                      {new Date(Number(TestamentInfo?.depositTimestamp) * 1000).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Info className="w-5 h-5 mr-1" />
                    <span>
                      <strong>Statut :</strong> {TestamentInfo?.status}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <h2 className="text-xl font-bold mb-2">Mes Soldes</h2>
                <p className="text-gray-700">
                  Balance MUSDT:{" "}
                  {balanceMUSDT ? formatUnits(balanceMUSDT, 18) : "Chargement..."}
                </p>
                <p className="text-gray-700">
                  Balance INHX:{" "}
                  {balanceINHX ? formatUnits(balanceINHX, 18) : "Chargement..."}
                </p>
              </CardContent>
            </Card>
          </section>

          {/* Colonne de droite : Dépôt et récupération du testament */}
          <section>
            <Card className="mb-6">
              <CardContent>
                <h2 className="text-xl font-bold mb-4">
                  Déposer un Testament
                </h2>
                <Input type="file" onChange={handleChangeFile} className="mb-4" />
                <Button
                  onClick={handleDepositTestament}
                  disabled={!file || uploading || !isConnected}
                >
                  {uploading
                    ? "Envoi en cours..."
                    : `Déposer ce Testament pour ${depositAmount} INHX`}
                </Button>
                {showSteps && (
                  <div className="mt-4">
                    <h3 className="text-lg font-semibold mb-2">
                      Étapes du processus :
                    </h3>
                    <ul className="space-y-2">
                      <li className="flex items-center">
                        {progress.encryptionStarted ? (
                          progress.encryptionDone ? (
                            <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                          ) : (
                            <Loader2 className="w-5 h-5 text-gray-400 mr-2 animate-spin" />
                          )
                        ) : null}
                        <span>Chiffrement du fichier</span>
                      </li>
                      <li className="flex items-center">
                        {progress.ipfsStarted ? (
                          progress.ipfsDone ? (
                            <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                          ) : (
                            <Loader2 className="w-5 h-5 text-gray-400 mr-2 animate-spin" />
                          )
                        ) : null}
                        <span>Dépôt sur IPFS</span>
                      </li>
                      <li className="flex items-center">
                        {progress.approvalStarted ? (
                          isApproveTxSuccess ? (
                            <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                          ) : isApproveLoading || isApprovePending ? (
                            <Loader2 className="w-5 h-5 text-gray-400 mr-2 animate-spin" />
                          ) : isApproveError ? (
                            <XCircle className="w-5 h-5 text-red-500 mr-2" />
                          ) : null
                        ) : null}
                        <span>Approbation du transfert de tokens</span>
                      </li>
                      <li className="flex items-center">
                        {progress.contractStarted ? (
                          contractHasError ? (
                            <XCircle className="w-5 h-5 text-red-500 mr-2" />
                          ) : progress.contractDone ? (
                            <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                          ) : (
                            <Loader2 className="w-5 h-5 text-gray-400 mr-2 animate-spin" />
                          )
                        ) : null}
                        <span>Dépôt sur le smart contract</span>
                      </li>
                    </ul>
                    {writeData && (
                      <div className="mt-4 p-3 border rounded-md bg-gray-100 text-sm break-all">
                        <strong>Hash de la transaction :</strong>
                        <p className="text-blue-600">{writeData}</p>
                      </div>
                    )}
                    <StatusAlert status={status} />
                  </div>
                )}
              </CardContent>
            </Card>
            {cid && (
              <Card className="mb-6">
                <CardContent>
                  <p className="mb-2">
                    <strong>Hash IPFS :</strong> {cid}
                  </p>
                  <p className="mb-4">
                    <strong>Clé de déchiffrement :</strong> {encryptionKey}
                  </p>
                  <Button onClick={retrieveAndDecryptFile}>
                    Récupérer et Déchiffrer le fichier
                  </Button>
                </CardContent>
              </Card>
            )}
            {decryptedFile && (
              <Card>
                <CardContent>
                  <h3 className="text-xl font-bold mb-4">
                    Fichier Déchiffré :
                  </h3>
                  {decryptedFile}
                </CardContent>
              </Card>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
