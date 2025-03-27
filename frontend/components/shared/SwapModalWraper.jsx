// SwapModalWrapper.jsx
"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import SwapComponent from "./Swap";

export default function SwapModalWrapper() {
  const [showSwap, setShowSwap] = useState(false);

  return (
    <>
      {/* Floating Swap Button (top right) */}
      <button
        onClick={() => setShowSwap(true)}
        className="fixed top-6 right-6 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-full shadow-lg z-50 font-semibold flex items-center gap-2"
      >
        💱 Swap
      </button>

      {/* Swap Modal */}
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
              {/* Close Button */}
              <button
                onClick={() => setShowSwap(false)}
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
              >
                <X size={20} />
              </button>

              <SwapComponent enableMax enableEstimate />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
