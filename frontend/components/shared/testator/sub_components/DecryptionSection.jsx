import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { publicClient } from "@/utils/client";
import { testamentManagerAddress, testamentManagerABI } from "@/constants";
import CryptoJS from "crypto-js";
import { useAccount } from "wagmi";

export default function DecryptionSection({ address }) {
  const [cidInput, setCidInput] = useState("");
  const [decryptedContent, setDecryptedContent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { address: accountAddress, isConnected } = useAccount();

  const handleDecrypt = async () => {
    if (!cidInput) {
      alert("Veuillez saisir un CID.");
      return;
    }
    try {
      // Récupérer la clé de cryptage depuis le contrat
      const decryptionKey = await publicClient.readContract({
        address: testamentManagerAddress,
        abi: testamentManagerABI,
        account: accountAddress,
        functionName: "getDecryptedKey",
        args: [cidInput],
      });

      if (!decryptionKey) {
        alert("Impossible de récupérer la clé de déchiffrement.");
        return;
      }

      // Récupérer le fichier chiffré depuis IPFS
      const gateway = process.env.NEXT_PUBLIC_GATEWAY_URL;
      const res = await fetch(`https://${gateway}/ipfs/${cidInput}`);
      const encryptedData = await res.text();

      // Déchiffrer le fichier et ouvrir le modal
      decryptFile(encryptedData, decryptionKey);
    } catch (err) {
      console.error("Erreur lors du déchiffrement :", err);
      alert("Erreur de déchiffrement ou CID invalide.");
    }
  };

  const decryptFile = (encryptedData, secretKey) => {
    try {
      console.log(secretKey);
      const bytes = CryptoJS.AES.decrypt(encryptedData, secretKey);
      const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
      let content = null;
      // Pour centrer et redimensionner le contenu, on fixe des dimensions maximales
      const maxStyles = {
        maxHeight: 'calc(90vh - 100px)',
        maxWidth: 'calc(90vw - 100px)',
      };

      if (decryptedData.startsWith("data:image/")) {
        content = (
          <img
            src={decryptedData}
            alt="Déchiffré"
            className="object-contain"
            style={maxStyles}
          />
        );
      } else if (decryptedData.startsWith("data:application/pdf")) {
        content = (
          <iframe
            src={decryptedData}
            title="PDF Déchiffré"
            className="object-contain"
            style={maxStyles}
          />
        );
      } else {
        alert("Le fichier déchiffré n'est ni une image ni un PDF.");
        return;
      }
      setDecryptedContent(content);
      setIsModalOpen(true);
    } catch (err) {
      console.error("Erreur de déchiffrement :", err);
      alert("Clé incorrecte ou fichier corrompu.");
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setDecryptedContent(null);
  };

  return (
    <>
      <div className="flex items-center gap-4">
        <Input
          type="text"
          placeholder="Entrer un CID"
          value={cidInput}
          onChange={(e) => setCidInput(e.target.value)}
          className="flex-1"
        />
        <Button onClick={handleDecrypt} className="whitespace-nowrap">
          Déchiffrer
        </Button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div
            className="bg-white rounded-lg shadow-lg p-6 relative max-w-[90vw] max-h-[90vh] overflow-hidden"
          >
            <button
              onClick={closeModal}
              className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
            >
              Fermer
            </button>
            <h4 className="text-lg font-semibold mb-4 text-center">
              Contenu Déchiffré :
            </h4>
            <div className="flex items-center justify-center w-full h-full">
              {decryptedContent}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
