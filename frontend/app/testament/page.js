"use client";
import Head from "next/head";
import Files from "@/components/shared/Files";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import CryptoJS from 'crypto-js';

export default function Home() {

    const [file, setFile] = useState(null);
    const [cid, setCid] = useState("");
    const [uploading, setUploading] = useState(false);
    const [decryptedImage, setDecryptedImage] = useState(null);
    const [decryptedPDF, setDecryptedPDF] = useState(null);
    const [decryptedText, setDecryptedText] = useState(null);
    const [encryptionKey, setEncryptionKey] = useState(""); // Clé générée automatiquement

    const inputFile = useRef(null);

    // Fonction pour générer une clé aléatoire sécurisée
    const generateEncryptionKey = () => {
        return CryptoJS.lib.WordArray.random(32).toString();
    };

    // Lire le fichier sous forme de Data URL
    const readFileAsDataURL = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    // Encrypt image or PDF function
    const encryptImage = async (file, secretKey) => {
        const fileData = await readFileAsDataURL(file);
        const encryptedData = CryptoJS.AES.encrypt(fileData, secretKey).toString();
        return encryptedData;
    };

    // Decrypt image or PDF function
    const decryptFile = (encryptedData, secretKey) => {
        try {
            const bytes = CryptoJS.AES.decrypt(encryptedData, secretKey);

            // Important: Utiliser `CryptoJS.enc.Base64` pour les données binaires
            const decryptedData = bytes.toString(CryptoJS.enc.Utf8);

            console.log("Données déchiffrées :", decryptedData);

            // Réinitialiser les anciens états
            setDecryptedImage(null);
            setDecryptedPDF(null);
            setDecryptedText(null);

            // Vérification du type de fichier
            if (decryptedData.startsWith('data:image/')) {
                setDecryptedImage(decryptedData);
            } else if (decryptedData.startsWith('data:application/pdf')) {
                setDecryptedPDF(decryptedData);
            } else {
                // Si ce n'est ni une image ni un PDF, on l'affiche comme du texte
                setDecryptedText(decryptedData);
            }
        } catch (error) {
            console.error("Erreur lors du déchiffrement :", error);
            alert("La clé est incorrecte ou le fichier est corrompu.");
        }
    };


    const uploadFile = async () => {
        if (!file) {
            alert("Veuillez sélectionner un fichier avant d'envoyer.");
            return;
        }

        try {
            const secretKey = generateEncryptionKey(); // Génère la clé de chiffrement
            setEncryptionKey(secretKey); // Sauvegarde la clé générée
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
            secretKey = secretKey.trim(); // Supprimer les espaces superflus
    
            const response = await fetch(`https://${process.env.NEXT_PUBLIC_GATEWAY_URL}/ipfs/${cid}`);
            const encryptedData = await response.text();  // Important : `.text()` pour préserver les données chiffrées
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
        <>
            <div className="flex flex-col items-center p-6">
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

                        {decryptedImage && (
                            <div className="mt-4 p-2 border rounded-lg">
                                <p><strong>Image Déchiffrée :</strong></p>
                                <img src={decryptedImage} alt="Decrypted" className="rounded-lg shadow-md" />
                            </div>
                        )}

                        {decryptedPDF && (
                            <div className="mt-4 p-2 border rounded-lg">
                                <p><strong>PDF Déchiffré :</strong></p>
                                <iframe
                                    src={decryptedPDF}
                                    title="PDF Déchiffré"
                                    width="100%"
                                    height="500px"
                                />
                            </div>
                        )}

                        {decryptedText && (
                            <div className="mt-4 p-2 border rounded-lg">
                                <p><strong>Texte Déchiffré :</strong></p>
                                <pre>{decryptedText}</pre>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
