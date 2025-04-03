"use client";
import { useAccount } from "wagmi";
import Sidebar from "@/components/shared/testator/sub_components/Sidebar";
import Header from "@/components/shared/testator/sub_components/Header";
import { useState } from "react";
import SwapModalWrapper from "@/components/shared/SwapModalWraper";

export default function TestatorLayout({ children, setSwapSuccessCallback }) {
  const { address } = useAccount();
  const [showSwap, setShowSwap] = useState(false);
  const [onSwapSuccess, setOnSwapSuccess] = useState(() => () => {});

  if (setSwapSuccessCallback) {
    setSwapSuccessCallback(setOnSwapSuccess);
  }

  if (!address) {
    return <main className="p-6">{children}</main>;
  }

  // Sinon, layout complet avec sidebar/header/modal
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Header address={address} onOpenSwap={() => setShowSwap(true)} />
        <SwapModalWrapper
          showSwap={showSwap}
          onClose={() => setShowSwap(false)}
          onSwapSuccess={() => {
            if (
              typeof window !== "undefined" &&
              typeof window.__onSwapSuccessFromDashboard === "function"
            ) {
              window.__onSwapSuccessFromDashboard();
            }
          }}
        />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
