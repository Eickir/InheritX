"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ScrollText,
  BarChart,
  ShieldCheck
} from "lucide-react";

export default function Sidebar() {
  const [expanded, setExpanded] = useState(false);
  const pathname = usePathname();

  const menuItems = [
    { label: "Mon Dashboard", icon: <LayoutDashboard className="w-5 h-5" />, page: "/testator" },
    { label: "Mes Testaments", icon: <ScrollText className="w-5 h-5" />, page: "/testator/testaments" },
  ];

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
            {menuItems.map(({ label, icon, page }) => {
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
