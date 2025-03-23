"use client";
import Head from "next/head";
import Files from "@/components/shared/Files";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {

    const [file, setFile] = useState(null);
    const [cid, setCid] = useState("");
    const [uploading, setUploading] = useState(false);

    const inputFile = useRef(null);

    const uploadFile = async () => {
        if (!file) {
            alert("Veuillez sélectionner un fichier avant d'envoyer.");
            return;
        }

        try {
            setUploading(true);
            const formData = new FormData();
            formData.append("file", file, file.name);
            const request = await fetch("/api/files", {
                method: "POST",
                body: formData,
            });
            const response = await request.json();
            console.log(response.cid);  // Vérification immédiate dans la console
            setCid(response.cid);       // Met à jour le state
            setUploading(false);
        } catch (e) {
            console.log(e);
            setUploading(false);
            alert("Trouble uploading file");
        }
    };

    const handleChange = (e) => {
        setFile(e.target.files[0]);
    };

    const loadRecent = async () => {
        try {
            const res = await fetch("/api/files");
            const json = await res.json();
            setCid(json.cid);
        } catch (e) {
            console.log(e);
            alert("trouble loading files");
        }
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

                        {/* Affichage immédiat du CID dans le composant */}
                        {cid && (
                            <div className="mt-4 p-2 border rounded-lg">
                                <p><strong>Hash IPFS :</strong> {cid}</p>
                                <a
                                    href={`https://ipfs.io/ipfs/${cid}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-500 underline"
                                >
                                    Voir sur IPFS
                                </a>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
