"use client";
import { useAccount, useReadContract } from "wagmi";
import { useEffect, useState } from "react";
import { formatUnits } from "viem";

import SidebarValidator from "@/components/shared/validator_dashboard/Sidebar";
import Header from "@/components/shared/validator_dashboard/sub_components/Header";
import SwapModalWrapper from "@/components/shared/SwapModalWraper";

import { inhxABI, inhxAddress, musdtABI, musdtAddress } from "@/constants";

export default function TestatorLayout({ children, setSwapSuccessCallback }) {
  const { address } = useAccount();
  const [showSwap, setShowSwap] = useState(false);
  const [onSwapSuccess, setOnSwapSuccess] = useState(() => () => {});
  const [balanceINHX, setBalanceINHX] = useState("0");
  const [balanceMUSDT, setBalanceMUSDT] = useState("0");

  if (setSwapSuccessCallback) {
    setSwapSuccessCallback(setOnSwapSuccess);
  }

  // Read contracts
  const { data: rawINHX } = useReadContract({
    address: inhxAddress,
    abi: inhxABI,
    functionName: "balanceOf",
    args: [address],
    watch: true,
    account: address,
  });

  const { data: rawMUSDT } = useReadContract({
    address: musdtAddress,
    abi: musdtABI,
    functionName: "balanceOf",
    args: [address],
    watch: true,
    account: address,
  });

  useEffect(() => {
    if (rawINHX) {
      setBalanceINHX(Number(formatUnits(rawINHX, 18)).toFixed(2));
    }
    if (rawMUSDT) {
      setBalanceMUSDT(Number(formatUnits(rawMUSDT, 18)).toFixed(2));
    }
  }, [rawINHX, rawMUSDT]);

  if (!address) {
    return <main className="p-6">{children}</main>;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SidebarValidator />
      <div className="flex flex-col flex-1">
        <Header
          address={address}
          onOpenSwap={() => setShowSwap(true)}
          balanceINHX={balanceINHX}
          balanceMUSDT={balanceMUSDT}
        />
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
