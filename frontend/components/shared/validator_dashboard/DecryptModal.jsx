import { Button } from "@/components/ui/button";

export default function DecryptModal({ file, onApprove, onReject, onClose, pendingActionHash }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-auto p-6 rounded-lg shadow-lg">
        <h3 className="text-lg font-semibold mb-4">Contenu du testament</h3>
        <div className="border p-3 mb-4 bg-gray-50">
          {file || "(contenu vide ou non déchiffré)"}
        </div>
        <div className="flex justify-between">
          <Button variant="destructive" onClick={onReject}>Rejeter</Button>
          <Button className="bg-green-600 hover:bg-green-700" onClick={onApprove}>Approuver</Button>
        </div>
        <Button
          variant="ghost"
          className="mt-4 text-gray-500 hover:text-gray-700"
          onClick={onClose}
          disabled={!!pendingActionHash}
        >
          Fermer
        </Button>
      </div>
    </div>
  );
}