"use client";
import Head from "next/head";
import Files from "@/components/shared/Files";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import CryptoJS from 'crypto-js';
import SwapModalWrapper from "@/components/shared/SwapModalWraper";

export default function Home() {

    const [file, setFile] = useState(null);
    const [cid, setCid] = useState("");
    const [uploading, setUploading] = useState(false);
    const [decryptedFile, setDecryptedFile] = useState(null);
    const [encryptionKey, setEncryptionKey] = useState("");

    const inputFile = useRef(null);

    const generateEncryptionKey = () => {
        return CryptoJS.lib.WordArray.random(32).toString();
    };

    const readFileAsDataURL = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const encryptImage = async (file, secretKey) => {
        const fileData = await readFileAsDataURL(file);
        const encryptedData = CryptoJS.AES.encrypt(fileData, secretKey).toString();
        return encryptedData;
    };

    const decryptFile = (encryptedData, secretKey) => {
        try {
            const bytes = CryptoJS.AES.decrypt(encryptedData, secretKey);
            const decryptedData = bytes.toString(CryptoJS.enc.Utf8);

            console.log("Données déchiffrées :", decryptedData);

            setDecryptedFile(null);  // Clear previous content

            if (decryptedData.startsWith('data:image/')) {
                setDecryptedFile(<img src={decryptedData} alt="Decrypted" className="rounded-lg shadow-md" />);
            } else if (decryptedData.startsWith('data:application/pdf')) {
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
        } catch (error) {
            console.error("Erreur lors du déchiffrement :", error);
            alert("La clé est incorrecte ou le fichier est corrompu.");
        }
    };

    const uploadFile = async () => {
        setDecryptedFile(null);  // Clear decrypted content on new upload

        if (!file) {
            alert("Veuillez sélectionner un fichier avant d'envoyer.");
            return;
        }

        try {
            const secretKey = generateEncryptionKey();
            setEncryptionKey(secretKey);
            const encryptedData = await encryptImage(file, secretKey);

            setUploading(true);
            const formData = new FormData();
            const blob = new Blob([encryptedData], { type: "text/plain" });
            formData.append("file", blob, "encrypted-file.txt");

            const request = await fetch("/api/files", {
                method: "POST",
                body: formData,
            });
            const response = await request.json();
            console.log("CID reçu :", response.cid);
            setCid(response.cid);
            setUploading(false);
        } catch (e) {
            console.error("Erreur lors de l'upload :", e);
            setUploading(false);
            alert("Trouble uploading file");
        }
    };

    const retrieveAndDecryptFile = async () => {
        if (!cid) {
            alert("Aucun CID disponible pour récupérer le fichier.");
            return;
        }

        try {
            let secretKey = prompt("Entrez la clé de déchiffrement :");
            if (!secretKey) return;
            secretKey = secretKey.trim();

            const response = await fetch(`https://${process.env.NEXT_PUBLIC_GATEWAY_URL}/ipfs/${cid}`);
            const encryptedData = await response.text();
            console.log("Données chiffrées récupérées :", encryptedData);

            decryptFile(encryptedData, secretKey);
        } catch (e) {
            console.error("Erreur lors de la récupération du fichier :", e);
            alert("Erreur lors de la récupération du fichier");
        }
    };

    const handleChange = (e) => {
        setFile(e.target.files[0]);
    };

    return (
        <div className="flex flex-row items-start p-6 gap-6">
            <div className="flex flex-col items-center w-1/2">
                <Card className="w-full max-w-md">
                    <CardContent className="space-y-4">
                        <h2 className="text-xl font-bold">Uploader un fichier sur IPFS</h2>
                        <Input type="file" onChange={handleChange} />
                        <Button onClick={uploadFile} disabled={uploading}>
                            {uploading ? 'Envoi en cours...' : 'Envoyer sur IPFS'}
                        </Button>

                        {cid && (
                            <div className="mt-4 p-2 border rounded-lg">
                                <p><strong>Hash IPFS :</strong> {cid}</p>
                                <p>
                                    <strong>🔐 Clé de déchiffrement :</strong> {encryptionKey}
                                </p>
                                <Button onClick={retrieveAndDecryptFile}>
                                    Récupérer et Déchiffrer le fichier
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Zone pour afficher le fichier déchiffré */}
            {decryptedFile && (
                <div className="w-1/2 p-4 border rounded-lg shadow-md">
                    <h3 className="text-xl font-bold mb-4">Fichier Déchiffré :</h3>
                    {decryptedFile}
                </div>
            )}
        
        <SwapModalWrapper />
        </div>

    );
}
