import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle, CheckCircle2, AlertCircle } from "lucide-react";
import CryptoJS from "crypto-js";
import { parseUnits } from "viem";
import {
  inhxAddress,
  inhxABI,
  testamentManagerAddress,
  testamentManagerABI,
} from "@/constants";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";

//
// Composant parent : il contrôle le remount complet en changeant la clé passée au composant interne.
//
export default function DepositTestamentForm({ address, isConnected, onDepositSuccess }) {
  const [resetKey, setResetKey] = useState(0);

  // Cette fonction sera appelée par le composant interne lorsque le processus est terminé
  // afin de forcer un remount complet.
  const handleReset = () => {
    setResetKey((prev) => prev + 1);
  };

  return (
    <DepositTestamentFormInternal
      key={resetKey}
      address={address}
      isConnected={isConnected}
      onDepositSuccess={onDepositSuccess}
      onProcessFinished={handleReset}
    />
  );
}

//
// Composant interne : toute la logique du dépôt se trouve ici.
// Lorsqu'un dépôt se termine, un timer de 5 secondes appelle onProcessFinished
// (qui force le remount complet via le composant parent).
//
function DepositTestamentFormInternal({ address, isConnected, onDepositSuccess, onProcessFinished }) {
  const [file, setFile] = useState(null);
  const [cid, setCid] = useState("");
  const [encryptionKey, setEncryptionKey] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [approvalFailed, setApprovalFailed] = useState(false);
  const [contractError, setContractError] = useState(false);
  const [ignoreErrors, setIgnoreErrors] = useState(false);
  const fileInputRef = useRef(null);

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
  const [transactionLaunched, setTransactionLaunched] = useState(false);

  const {
    data: approvalTxData,
    error: isApprovalError,
    writeContract: writeApprove,
  } = useWriteContract();
  const { isSuccess: isApprovalSuccess } = useWaitForTransactionReceipt({ hash: approvalTxData });

  const {
    data: depositTxData,
    error: isDepositError,
    writeContract: writeDeposit,
  } = useWriteContract();
  const { isSuccess: isDepositSuccess } = useWaitForTransactionReceipt({ hash: depositTxData });

  const generateEncryptionKey = () => CryptoJS.lib.WordArray.random(32).toString();

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

  // Réinitialise les états locaux (mais ne remonte pas les hooks externes)
  const resetLocalState = () => {
    setFile(null);
    setCid("");
    setEncryptionKey("");
    setUploading(false);
    setShowSteps(false);
    setTransactionLaunched(false);
    setStatusMessage(null);
    setApprovalFailed(false);
    setContractError(false);
    setIgnoreErrors(false);
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
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDepositTestament = async () => {
    if (!file || !isConnected || !address) {
      setStatusMessage({ type: "error", text: "Veuillez connecter votre wallet et choisir un fichier." });
      return;
    }

    // Réinitialisation locale avant de lancer le processus
    resetLocalState();
    setIgnoreErrors(false);
    setShowSteps(true);
    setUploading(true);

    try {
      const secretKey = generateEncryptionKey();
      setEncryptionKey(secretKey);

      setProgress((p) => ({ ...p, encryptionStarted: true }));
      const encryptedData = await encryptFile(file, secretKey);
      setProgress((p) => ({ ...p, encryptionDone: true }));

      setProgress((p) => ({ ...p, ipfsStarted: true }));
      const formData = new FormData();
      formData.append("file", new Blob([encryptedData], { type: "text/plain" }), "encrypted.txt");
      const res = await fetch("/api/files", { method: "POST", body: formData });
      const resData = await res.json();
      setCid(resData.cid);
      setProgress((p) => ({ ...p, ipfsDone: true }));

      setProgress((p) => ({ ...p, approvalStarted: true }));
      try {
        await writeApprove({
          address: inhxAddress,
          abi: inhxABI,
          functionName: "approve",
          args: [testamentManagerAddress, parseUnits("100", 18)],
          account: address,
        });
      } catch (err) {
        setApprovalFailed(true);
        throw err;
      }
    } catch (err) {
      console.error("Erreur pendant l'envoi :", err);
      setStatusMessage({ type: "error", text: "Erreur durant le traitement. Vérifiez les étapes ou réessayez." });
      setUploading(false);
    }
  };

  useEffect(() => {
    if ((isApprovalError || approvalFailed) && !ignoreErrors) {
      setApprovalFailed(true);
      setStatusMessage({ type: "error", text: "Transaction d'approbation échouée." });
      setProgress((p) => ({ ...p, approvalDone: false }));
      setUploading(false);
    }
  }, [isApprovalError, approvalFailed, ignoreErrors]);

  useEffect(() => {
    if ((isDepositError || contractError) && !ignoreErrors) {
      setContractError(true);
      setStatusMessage({ type: "error", text: "Transaction de dépôt échouée." });
      setProgress((p) => ({ ...p, contractDone: false }));
      setUploading(false);
    }
  }, [isDepositError, contractError, ignoreErrors]);

  useEffect(() => {
    const sendDeposit = async () => {
      if (isApprovalSuccess && !transactionLaunched && cid && encryptionKey && !approvalFailed) {
        setTransactionLaunched(true);
        setProgress((p) => ({ ...p, approvalDone: true, contractStarted: true }));
        try {
          await writeDeposit({
            address: testamentManagerAddress,
            abi: testamentManagerABI,
            functionName: "depositTestament",
            args: [cid, encryptionKey, parseUnits("100", 18)],
            account: address,
          });
        } catch (err) {
          setContractError(true);
          console.error("Erreur lors du dépôt :", err);
          setStatusMessage({ type: "error", text: "Erreur lors de l'envoi au smart contract." });
          setUploading(false);
        }
      }
    };
    sendDeposit();
  }, [isApprovalSuccess, cid, encryptionKey, writeDeposit, approvalFailed, transactionLaunched, address]);

  useEffect(() => {
    if (isDepositSuccess) {
      setProgress((p) => ({ ...p, contractDone: true }));
      setStatusMessage({ type: "success", text: "Testament déposé avec succès !" });
      setUploading(false);
      onDepositSuccess?.();
    }
  }, [isDepositSuccess, onDepositSuccess]);

  // Dès que le processus est terminé (uploading false et statusMessage présent),
  // on lance un timer de 5 secondes pour forcer le remount complet via onProcessFinished.
  useEffect(() => {
    if (!uploading && showSteps && statusMessage) {
      const timer = setTimeout(() => {
        onProcessFinished();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [uploading, showSteps, statusMessage, onProcessFinished]);

  return (
    <Card>
  <CardContent>
    <h3>Déposer un Testament</h3>
    <Input type="file" onChange={(e) => setFile(e.target.files[0])} ref={fileInputRef} />
    <Button onClick={handleDepositTestament} disabled={!file || uploading || !isConnected}>
      {uploading ? "Envoi en cours..." : "Déposer pour 100 INHX"}
    </Button>

    {statusMessage && (
      <div>
        {statusMessage.type === "success" ? <CheckCircle2 /> : <AlertCircle />}
        {statusMessage.text}
      </div>
    )}

    {showSteps && (
      <ul>
        {[
          ["encryption", "Chiffrement du fichier"],
          ["ipfs", "Dépôt sur IPFS"],
          ["approval", "Approbation du transfert"],
          ["contract", "Dépôt sur le smart contract"],
        ].map(([step, label]) => {
          let icon = null;
          const started = progress[`${step}Started`];
          const done = progress[`${step}Done`];
          const failed = (step === "approval" && approvalFailed) || (step === "contract" && contractError);
          if (failed) icon = <XCircle />;
          else if (done) icon = <CheckCircle />;
          else if (started) icon = <Loader2 className="animate-spin" />;
          return (
            <li key={step}>
              {icon}
              {label}
            </li>
          );
        })}
      </ul>
    )}
  </CardContent>
</Card>

  );
}
