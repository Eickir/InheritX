"use client";
import Head from "next/head";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { parseUnits } from "viem";
import {
  XCircle,
  Loader2,
  CheckCircle,
  PartyPopper,
} from "lucide-react";
import CryptoJS from "crypto-js";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from "wagmi";
import { testamentManagerABI, testamentManagerAddress, inhxAddress, inhxABI, musdtAddress, musdtABI} from "@/constants";

const depositAmount = "100"; // 100 INHX

/**
 * Détermine, selon les flags wagmi, quel statut prioritaire afficher.
 * Renvoie un objet { type, text }, ou null s'il n'y a pas de statut.
 */
function getTransactionStatus({ isWriteError, isPending, isError, isSuccess }) {
  // 1. Erreur locale
  if (isWriteError) {
    return {
      type: "error",
      text: "Échec local : transaction rejetée ou revert avant broadcast.",
    };
  }
  // 2. Pending
  if (isPending) {
    return {
      type: "pending",
      text: "Transaction en attente de confirmation sur la blockchain...",
    };
  }
  // 3. Erreur on-chain
  if (isError) {
    return {
      type: "error",
      text: "La transaction a échoué ou a revert on-chain.",
    };
  }
  // 4. Succès
  if (isSuccess) {
    return {
      type: "success",
      text: "Transaction confirmée avec succès ! Testament enregistré.",
    };
  }
  // 5. Aucun statut
  return null;
}

/**
 * Affiche une alerte colorée (avec icône) selon le type de statut.
 * @param { type: "pending"|"success"|"error", text: string } status
 */
function StatusAlert({ status }) {
  if (!status) return null; // rien à afficher si pas de statut

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

  const {data: balanceINHX} = useReadContract({
    address: inhxAddress,
    abi: inhxABI,
    functionName: "balanceOf",
    args: [address],
    account: address,
  })

  const {data: balanceMUSDT} = useReadContract({
    address: musdtAddress,
    abi: musdtABI,
    functionName: "balanceOf",
    args: [address],
    account: address,
  })

  const {data: TestamentInfo} = useReadContract({
    address: testamentManagerAddress,
    abi: testamentManagerABI,
    functionName: "getTestament",
    args: [address],
    account: address,
  })


  // --- Wagmi hooks ---
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
  } = useWaitForTransactionReceipt({ hash: writeData?.hash });

  // Fichier + Encrypted
  const [file, setFile] = useState(null);
  const [cid, setCid] = useState("");
  const [decryptedFile, setDecryptedFile] = useState(null);
  const [encryptionKey, setEncryptionKey] = useState("");

  // Afficher ou non les étapes
  const [showSteps, setShowSteps] = useState(false);

  // Indique si on est en train d'envoyer (pour désactiver le bouton)
  const [uploading, setUploading] = useState(false);

  // Contrôle le statut de chaque étape
  const [progress, setProgress] = useState({
    encryptionStarted: false,
    encryptionDone: false,
    ipfsStarted: false,
    ipfsDone: false,
    contractStarted: false,
    contractDone: false,
  });

  // 1) Chiffrement
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

  // 2) Dépôt testament
  const handleDepositTestament = async () => {
    if (!file) return;
    try {
      // On montre les étapes seulement après clic
      setShowSteps(true);

      // Reset
      setCid("");
      setDecryptedFile(null);
      setProgress({
        encryptionStarted: false,
        encryptionDone: false,
        ipfsStarted: false,
        ipfsDone: false,
        contractStarted: false,
        contractDone: false,
      });
      setUploading(true);

      // Génère la clé
      const secretKey = generateEncryptionKey();
      setEncryptionKey(secretKey);

      // Étape 1 : chiffrement
      setProgress((p) => ({ ...p, encryptionStarted: true }));
      const encryptedData = await encryptFile(file, secretKey);
      setProgress((p) => ({ ...p, encryptionDone: true }));

      // Étape 2 : IPFS
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

      // Étape 3 : Transaction
      console.log(resData.cid, secretKey, depositAmount);
      setProgress((p) => ({ ...p, contractStarted: true }));
      writeContract({
        address: testamentManagerAddress,
        abi: testamentManagerABI,
        functionName: "depositTestament",
        args: [resData.cid, secretKey, parseUnits(depositAmount, 18)],
        account: address,
      });
    } catch (err) {
      console.error("Erreur globale dans le processus:", err);
      alert("Échec lors du chiffrement ou du dépôt IPFS.");
    } finally {
      setUploading(false);
    }
  };

  // 3) Récupération IPFS + déchiffrement
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

  // 4) useEffect -> quand isSuccess est true, on marque la 3e étape comme terminée
  useEffect(() => {
    if (isSuccess) {
      setProgress((p) => ({ ...p, contractDone: true }));
    }
  }, [isSuccess]);

  const handleChangeFile = (e) => setFile(e.target.files[0]);

  // Déterminer le statut global prioritaire :
  const status = getTransactionStatus({
    isWriteError,
    isPending,
    isError,
    isSuccess,
  });

  // Savoir si la transaction a eu une erreur (locale ou on-chain)
  const contractHasError = isWriteError || isError;

  return (
    <>
    <div>Testament: {TestamentInfo}</div>
    <div>Balance MUSDT: {balanceMUSDT} </div>
    <div>Balance INHX: {balanceINHX} </div>
    <div className="flex flex-col items-center p-6 gap-6">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-4">
          <h2 className="text-xl font-bold">Uploader un fichier sur IPFS</h2>
          <Input type="file" onChange={handleChangeFile} />

          <Button
            onClick={handleDepositTestament}
            disabled={!file || uploading || !isConnected}
          >
            {uploading
              ? "Envoi en cours..."
              : `Déposer ce Testament pour ${depositAmount} INHX`}
          </Button>

          {/* Étapes : affichées SEULEMENT si showSteps = true */}
          {showSteps && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">Étapes du processus :</h3>
              <ul className="space-y-2">
                {/* Étape 1 : chiffrement */}
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

                {/* Étape 2 : IPFS */}
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

                {/* Étape 3 : Smart contract */}
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

              {/* Hash de la transaction (si dispo) */}
              {writeData?.hash && (
                <div className="mt-4 p-3 border rounded-md bg-gray-100 text-sm break-all">
                  <strong>Hash de la transaction :</strong>
                  <p className="text-blue-600">{writeData.hash}</p>
                </div>
              )}

              {/* 
                Affichage d'un SEUL message d'alerte :
                (pending, succès, erreur locale ou on-chain)
              */}
              <StatusAlert status={status} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Infos IPFS + clé */}
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

      {/* Fichier déchiffré */}
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
