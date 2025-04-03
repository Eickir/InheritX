"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useState } from "react";

export default function Header({ onSwapSuccess }) {
  const [showSwap, setShowSwap] = useState(false);
  const pathname = usePathname();
  const eligiblePaths = ["/testator/", "/testator/testaments", "/testator/staking", "/testator/validator",  "/validator"];
  const isEligible = eligiblePaths.includes(pathname);

  return (
    <header className="sticky top-0 z-50 bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between">
      <Link href="/">
        <p className="text-2xl font-bold text-white">InheritX</p>
      </Link>

      {isEligible && (
        <div className="flex items-center gap-8">
          <ConnectButton accountStatus="address" showBalance={false} />
        </div>
      )}
    </header>
  );
}
