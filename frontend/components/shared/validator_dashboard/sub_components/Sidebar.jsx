"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount, useReadContract } from "wagmi";
import {
  LayoutDashboard,
  FileSearch,
  BarChart
} from "lucide-react";
import { validatorPoolABI, validatorPoolAddress } from "@/constants";

export default function SidebarValidator() {
  const [expanded, setExpanded] = useState(false);
  const pathname = usePathname();
  const { address } = useAccount();

  const { data: isAuthorized } = useReadContract({
    address: validatorPoolAddress,
    abi: validatorPoolABI,
    functionName: "isAuthorized",
    args: [address],
    account: address,
    watch: true,
  });

  const allMenuItems = [
    { label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" />, page: "/validator" },
    { label: "Testaments à valider", icon: <FileSearch className="w-5 h-5" />, page: "/validator/testaments" },
  ];

  // Si pas encore autorisé, on ne garde que "Dashboard"
  const visibleMenuItems = isAuthorized ? allMenuItems : [allMenuItems[0]];

  return (
    <div
      className={`bg-white shadow transition-all duration-300 ${
        expanded ? "w-64" : "w-20"
      }`}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <div className="h-screen flex flex-col p-4">
        <div className="flex items-center mb-8">
          <LayoutDashboard className="w-6 h-6 text-blue-600" />
          {expanded && <span className="ml-2 font-bold text-lg">Menu</span>}
        </div>

        <nav className="flex-1">
          <ul className="space-y-4">
            {visibleMenuItems.map(({ label, icon, page }) => {
              const isActive = pathname === page;
              return (
                <li key={label}>
                  <Link
                    href={page}
                    className={`flex items-center gap-2 px-2 py-2 rounded-md transition-colors ${
                      isActive
                        ? "bg-blue-100 text-blue-700 font-medium"
                        : "hover:text-blue-600"
                    }`}
                  >
                    {icon}
                    {expanded && <span>{label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}
