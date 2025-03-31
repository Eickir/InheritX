import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import CryptoJS from "crypto-js";
import { parseUnits } from "viem";
import { inhxAddress, inhxABI, testamentManagerAddress, testamentManagerABI } from "@/constants";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import StatusAlert from "./StatusAlert";

const depositAmount = "100"; // 100 INHX

export default function DepositTestamentForm({ address, isConnected }) {
  const [file, setFile] = useState(null);
  const [cid, setCid] = useState("");
  const [encryptionKey, setEncryptionKey] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
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
  const [decryptedFile, setDecryptedFile] = useState(null);

  // Hooks pour l'approbation et l'envoi sur le smart contract
  const {
    data: approveData,
    writeContract: writeApprove,
  } = useWriteContract();
  const {
    isPending: isApprovePending,
    isSuccess: isApproveTxSuccess,
    isLoading: isApproveLoading,
    isError: isApproveTxError,
  } = useWaitForTransactionReceipt({ hash: approveData });

  const { data: writeData, error: writeError, isError, isSuccess, writeContract } = useWriteContract();

  // Fonction utilitaire pour générer une clé de chiffrement
  const generateEncryptionKey = () => CryptoJS.lib.WordArray.random(32).toString();

  // Fonction pour lire le fichier en DataURL
  const readFileAsDataURL = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  // Fonction pour chiffrer le fichier
  const encryptFile = async (file, secretKey) => {
    const fileData = await readFileAsDataURL(file);
    return CryptoJS.AES.encrypt(fileData, secretKey).toString();
  };

  const handleChangeFile = (e) => setFile(e.target.files[0]);

  // Fonction de dépôt complète, intégrant chiffrement, dépôt sur IPFS et approbation
  const handleDepositTestament = async () => {
    if (!file) return;
    try {
      // Réinitialisation des états et démarrage du processus
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

  // Déclenchement du dépôt sur le smart contract après approbation
  useEffect(() => {
    const tryWriteContract = async () => {
      if (approveData && isApproveTxSuccess) {
        // Approbation effectuée, mise à jour de l'état
        setProgress((p) => ({ ...p, approvalDone: true, contractStarted: true }));
        try {
          await writeContract({
            address: testamentManagerAddress,
            abi: testamentManagerABI,
            functionName: "depositTestament",
            args: [cid, encryptionKey, parseUnits(depositAmount, 18)],
            account: address,
          });
        } catch (err) {
          console.error("Erreur lors du dépôt :", err);
          alert("Erreur lors de l'envoi du testament sur le smart contract.");
          setUploading(false);
          setProgress((p) => ({ ...p, contractStarted: false, contractDone: false }));
        }
      }
    };
    tryWriteContract();
  }, [approveData, isApproveTxSuccess, cid, encryptionKey, address, writeContract]);

  // Une fois la transaction confirmée, on arrête le chargement
  useEffect(() => {
    if (isSuccess) {
      setProgress((p) => ({ ...p, contractDone: true }));
      setUploading(false);
    }
  }, [isSuccess]);

  // Optionnel : récupérer le statut de la transaction pour l'afficher via StatusAlert
  const status = null; // Vous pouvez utiliser votre fonction getTransactionStatus ici

  return (
    <Card>
      <CardContent>
        <h3 className="text-lg font-semibold mb-2">Déposer un Testament</h3>
        <Input type="file" onChange={handleChangeFile} className="mb-2" />
        <Button
          onClick={handleDepositTestament}
          disabled={!file || uploading || !isConnected}
          className="mb-4"
        >
          {uploading ? "Envoi en cours..." : `Déposer pour ${depositAmount} INHX`}
        </Button>
        {status && <StatusAlert status={status} />}
        {showSteps && (
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              {progress.encryptionStarted ? (
                progress.encryptionDone ? (
                  <CheckCircle className="text-green-500 w-4 h-4" />
                ) : (
                  <Loader2 className="text-gray-400 w-4 h-4 animate-spin" />
                )
              ) : null}
              Chiffrement du fichier
            </li>
            <li className="flex items-center gap-2">
              {progress.ipfsStarted ? (
                progress.ipfsDone ? (
                  <CheckCircle className="text-green-500 w-4 h-4" />
                ) : (
                  <Loader2 className="text-gray-400 w-4 h-4 animate-spin" />
                )
              ) : null}
              Dépôt sur IPFS
            </li>
            <li className="flex items-center gap-2">
              {progress.approvalStarted ? (
                isApproveTxSuccess ? (
                  <CheckCircle className="text-green-500 w-4 h-4" />
                ) : isApproveLoading || isApprovePending ? (
                  <Loader2 className="text-gray-400 w-4 h-4 animate-spin" />
                ) : (
                  <XCircle className="text-red-500 w-4 h-4" />
                )
              ) : null}
              Approbation du transfert
            </li>
            <li className="flex items-center gap-2">
              {progress.contractStarted ? (
                progress.contractDone ? (
                  <CheckCircle className="text-green-500 w-4 h-4" />
                ) : (
                  <Loader2 className="text-gray-400 w-4 h-4 animate-spin" />
                )
              ) : null}
              Dépôt sur le smart contract
            </li>
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
