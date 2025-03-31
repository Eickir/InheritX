"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import SwapModalWrapper from "./SwapModalWraper";
import { useState } from "react";

export default function Header() {
  const [showSwap, setShowSwap] = useState(false);
  const pathname = usePathname();
  const eligiblePaths = ["/login", "/testator", "/validator"];
  const isEligible = eligiblePaths.includes(pathname);

  return (
    <header className="sticky top-0 z-50 bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between">
      <Link href="/">
        <p className="text-2xl font-bold text-white">InheritX</p>
      </Link>

      {isEligible && (
        <div className="flex items-center gap-8">
          {/* ConnectButton toujours visible, même non connecté */}
          <ConnectButton accountStatus="address" showBalance={false} />
          
          {/* Bouton Swap (non flottant) */}
          <button
            onClick={() => setShowSwap(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-full shadow-lg font-semibold"
          >
            Swap
          </button>
        </div>
      )}

      <SwapModalWrapper showSwap={showSwap} onClose={() => setShowSwap(false)} />
    </header>
  );
}
