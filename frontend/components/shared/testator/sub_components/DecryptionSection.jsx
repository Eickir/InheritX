import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function DecryptionSection({ cid, decryptFile, decryptedFile }) {
  const handleDecrypt = () => {
    if (!cid) return alert("Aucun CID disponible.");
    const key = prompt("Entrez la clé de déchiffrement :");
    if (key) {
      decryptFile(key.trim());
    }
  };

  return (
    <Card>
      <CardContent>
        <h3 className="text-lg font-semibold mb-2">Déchiffrer un testament</h3>
        <p className="text-sm text-gray-600 mb-2">
          Entrez la clé de déchiffrement pour consulter le contenu.
        </p>
        <Button onClick={handleDecrypt}>Déchiffrer</Button>
        {decryptedFile && (
          <div className="mt-4 border rounded bg-gray-50 p-2">
            <h4 className="text-sm font-semibold mb-2">Contenu Déchiffré :</h4>
            {decryptedFile}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
