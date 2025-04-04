"use client";

import { usePathname } from "next/navigation";

export default function Header({ address, onOpenSwap, balanceINHX, balanceMUSDT }) {
  const pathname = usePathname();

  const displayTitle = address
    ? `${address.slice(0, 6)}...${address.slice(-4)} dashboard`
    : "Dashboard";


  return (
    <header className="bg-white shadow px-4 py-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
      <h1 className="text-2xl font-bold text-gray-800">{displayTitle}</h1>

      <div className="flex items-center gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-gray-700">
            <span className="font-semibold">
              INHX: <span className="font-normal">{balanceINHX}</span>
            </span>
            <span className="font-semibold">
              MUSDT: <span className="font-normal">{balanceMUSDT}</span>
            </span>
          </div>
        

        {onOpenSwap && (
          <button
            onClick={onOpenSwap}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium"
          >
            Swap Tokens
          </button>
        )}
      </div>
    </header>
  );
}
