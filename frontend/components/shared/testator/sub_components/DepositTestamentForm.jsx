import { useState, useEffect, useRef } from "react";
import { Loader2, CheckCircle, XCircle, CheckCircle2, AlertCircle } from "lucide-react";
import CryptoJS from "crypto-js";
import { formatUnits } from "viem";
import {
  inhxAddress,
  inhxABI,
  testamentManagerAddress,
  testamentManagerABI,
} from "@/constants";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";

export default function DepositTestamentForm({ address, isConnected, onDepositSuccess, depositFee }) {
  const [resetKey, setResetKey] = useState(0);

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
      depositFee={depositFee}  // Prop uniformisée
    />
  );
}

function DepositTestamentFormInternal({ address, isConnected, onDepositSuccess, onProcessFinished, depositFee }) {
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
  const [depositHandled, setDepositHandled] = useState(false);

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
    setDepositHandled(false);
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
          args: [testamentManagerAddress, depositFee],
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
            args: [cid, encryptionKey, depositFee],
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
  }, [isApprovalSuccess, cid, encryptionKey, writeDeposit, approvalFailed, transactionLaunched, address, depositFee]);

  useEffect(() => {
    if (isDepositSuccess && !depositHandled) {
      setDepositHandled(true);
      setProgress((p) => ({ ...p, contractDone: true }));
      setStatusMessage({ type: "success", text: "Testament déposé avec succès !" });
      setUploading(false);
      onDepositSuccess?.();
    }
  }, [isDepositSuccess, depositHandled, onDepositSuccess]);

  useEffect(() => {
    if (!uploading && showSteps && statusMessage) {
      const timer = setTimeout(() => {
        setDepositHandled(false); // Reset pour le prochain dépôt
        onProcessFinished();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [uploading, showSteps, statusMessage, onProcessFinished]);

  return (
    <>        
      <div className="flex w-full items-center gap-4">
        {/* Input fichier : plus compact */}
        <div className="w-full max-w-xs">
          <input
            type="file"
            onChange={(e) => setFile(e.target.files[0])}
            ref={fileInputRef}
            className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none"
          />
        </div>

        {/* Bouton large */}
        <button
          onClick={handleDepositTestament}
          disabled={!file || uploading || !isConnected}
          className={`flex-1 px-4 py-2 text-sm font-semibold text-white rounded-md transition ${
            !file || uploading || !isConnected
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          {uploading ? "Envoi en cours..." : `Déposer pour ${depositFee? formatUnits(depositFee, 18): '0'} INHX`}
        </button>
      </div>

      {statusMessage && (
        <div
          className={`mb-4 p-3 rounded-md text-sm flex items-center gap-2 ${
            statusMessage.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {statusMessage.text}
        </div>
      )}

      {showSteps && (
        <ul className="space-y-2 text-sm">
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
            if (failed) {
              icon = <XCircle className="text-red-500 w-4 h-4" />;
            } else if (done) {
              icon = <CheckCircle className="text-green-500 w-4 h-4" />;
            } else if (started) {
              icon = <Loader2 className="text-gray-400 w-4 h-4 animate-spin" />;
            }
            return (
              <li key={step} className="flex items-center gap-2">
                {icon}
                {label}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
