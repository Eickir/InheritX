import { Button } from "@/components/ui/button";

export default function PendingTestamentTable({ testaments, onDecrypt }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left border-b">
          <th className="py-2">Adresse</th>
          <th className="py-2">CID</th>
          <th className="py-2 text-right">Actions</th>
        </tr>
      </thead>
      <tbody>
        {testaments.map((t) => (
          <tr key={`${t.cid}-${t.blockNumber}`} className="border-b">
            <td className="py-2 break-all">{t.depositor}</td>
            <td className="py-2 break-all">{t.cid}</td>
            <td className="py-2 text-right">
              <Button onClick={() => onDecrypt(t)}>Déchiffrer</Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}