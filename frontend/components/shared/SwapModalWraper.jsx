"use client";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import SwapComponent from "./Swap";

export default function SwapModal({ showSwap, onClose, onSwapSuccess }) {
  
  const handleTransactionSuccess = () => {
    console.log("🎯 handleTransactionSuccess triggered");
    onClose();  
    console.log("🧩 onSwapSuccess value:", onSwapSuccess);        
    onSwapSuccess?.(); 
  };

  return (
    <AnimatePresence>
      {showSwap && (
        <motion.div
          key="swap-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-40"
        >
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-white p-6 rounded-2xl shadow-2xl relative w-full max-w-md"
          >
            {/* Bouton de fermeture */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
            >
              <X size={20} />
            </button>
            <SwapComponent onTransactionSuccess={handleTransactionSuccess} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
