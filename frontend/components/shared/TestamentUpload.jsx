"use client";
import Head from "next/head";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { parseUnits } from "viem";
import { XCircle, Loader2, CheckCircle, PartyPopper } from "lucide-react";
import CryptoJS from "crypto-js";
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

const depositAmount = "100"; // 100 INHX

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

export default function Home() {
  
  const { address, isConnected } = useAccount();

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

  // Hook pour la transaction de dépôt sur le smart contract
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

  // Hooks pour l'approbation
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

  // États locaux
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
        setDecryptedFile(<img src={decryptedData} alt="Decrypted" />);
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

  // Log global pour suivre approveData et isApproveTxSuccess
  console.log("Rendu du composant:", { approveData, isApproveTxSuccess, cid, encryptionKey });

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
      // Le dépôt sur le smart contract sera déclenché dans le useEffect ci-dessous
    } catch (err) {
      console.error("Erreur globale dans le processus:", err);
      alert("Échec lors du chiffrement ou du dépôt sur IPFS.");
      setUploading(false);
    }
  };

  // useEffect pour déclencher le dépôt une fois l'approbation confirmée
  useEffect(() => {
    console.log("useEffect approval déclenché", {
      approveData,
      isApproveTxSuccess,
      cid,
      encryptionKey,
    });
    if (approveData && isApproveTxSuccess) {
      console.log("Approval confirmé, lancement de depositTestament", { cid, encryptionKey });
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

  return (
    <>
      <div>
      Testament CID: {TestamentInfo?.cid}<br />
      Clé de déchiffrement: {TestamentInfo?.decryptionKey}<br />
      Déposé le: {new Date(Number(TestamentInfo?.depositTimestamp) * 1000).toLocaleString()}<br />
      Statut: {TestamentInfo?.status.toString()}
      </div>
      <div>Balance MUSDT: {balanceMUSDT}</div>
      <div>Balance INHX: {balanceINHX}</div>
      <div className="flex flex-col items-center p-6 gap-6">
        <Card className="w-full max-w-md">
          <CardContent className="space-y-4">
            <h2 className="text-xl font-bold">
              Uploader un fichier sur IPFS et déposer son Testament
            </h2>
            <Input type="file" onChange={handleChangeFile} />
            <Button onClick={handleDepositTestament} disabled={!file || uploading || !isConnected}>
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
          <div className="w-full max-w-md p-4 border rounded-lg shadow-md">
            <p>
              <strong>Hash IPFS :</strong> {cid}
            </p>
            <p>
              <strong>Clé de déchiffrement :</strong> {encryptionKey}
            </p>
            <Button onClick={retrieveAndDecryptFile}>
              Récupérer et Déchiffrer le fichier
            </Button>
          </div>
        )}
        {decryptedFile && (
          <div className="w-full max-w-md p-4 border rounded-lg shadow-md">
            <h3 className="text-xl font-bold mb-4">Fichier Déchiffré :</h3>
            {decryptedFile}
          </div>
        )}
      </div>
    </>
  );
}
