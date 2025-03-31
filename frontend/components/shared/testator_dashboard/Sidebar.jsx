// Sidebar.jsx
import { useState } from "react";
import { Wallet, FileText, Info } from "lucide-react";

export default function Sidebar() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`bg-white shadow transition-all duration-300 ${expanded ? "w-64" : "w-20"}`}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <div className="h-screen flex flex-col p-4">
        <div className="flex items-center mb-8">
          <Wallet className="w-6 h-6 text-blue-600" />
          {expanded && <span className="ml-2 font-bold text-lg">Menu</span>}
        </div>
        <nav className="flex-1">
          <ul className="space-y-4">
            <li className="flex items-center gap-2 cursor-pointer hover:text-blue-600">
              <FileText className="w-5 h-5" />
              {expanded && <span>Dashboard</span>}
            </li>
            <li className="flex items-center gap-2 cursor-pointer hover:text-blue-600">
              <FileText className="w-5 h-5" />
              {expanded && <span>Mon Testament</span>}
            </li>
            <li className="flex items-center gap-2 cursor-pointer hover:text-blue-600">
              <Wallet className="w-5 h-5" />
              {expanded && <span>Mes Soldes</span>}
            </li>
            <li className="flex items-center gap-2 cursor-pointer hover:text-blue-600">
              <Info className="w-5 h-5" />
              {expanded && <span>Mes Stakings</span>}
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}
