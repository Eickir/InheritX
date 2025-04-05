"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function DecryptModal({ file, onApprove, onReject, onClose, pendingActionHash }) {
  const maxStyles = {
    maxHeight: 'calc(90vh - 200px)',
    maxWidth: 'calc(90vw - 100px)',
  };

  useEffect(() => {
    if (pendingActionHash) {
      // Dès qu'une action est validée, on ferme automatiquement
      const timer = setTimeout(() => {
        onClose();
      }, 500); // léger délai pour éviter fermeture trop brutale
      return () => clearTimeout(timer);
    }
  }, [pendingActionHash, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg p-6 relative w-full max-w-xl max-h-[90vh] flex flex-col">
        {/* Bouton Fermer */}
        <button
          onClick={onClose}
          disabled={!!pendingActionHash}
          className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
        >
          Fermer
        </button>

        <h4 className="text-lg font-semibold mb-4 text-center w-full">
          Contenu du testament
        </h4>

        {/* Zone centrale pour le contenu déchiffré */}
        <div className="flex-grow flex items-center justify-center bg-gray-50 rounded mb-6 overflow-hidden">
          {file ? (
            <div
              className="flex items-center justify-center w-full h-full"
              style={maxStyles}
            >
              {file}
            </div>
          ) : (
            <p className="text-gray-500">(contenu vide ou non déchiffré)</p>
          )}
        </div>

        {/* Boutons actions en bas */}
        <div className="flex justify-between mt-auto">
          <Button
            variant="destructive"
            onClick={onReject}
            disabled={!!pendingActionHash}
          >
            Rejeter
          </Button>
          <Button
            className="bg-green-600 hover:bg-green-700"
            onClick={onApprove}
            disabled={!!pendingActionHash}
          >
            Approuver
          </Button>
        </div>
      </div>
    </div>
  );
}
