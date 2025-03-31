// Header.jsx
import { Wallet } from "lucide-react";

export default function Header({ address }) {
  const displayAddress = address
    ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
    : "Non connecté";

  return (
    <header className="bg-white shadow px-4 py-6 flex justify-between items-center">
      <h1 className="text-3xl font-bold">Tableau de Bord du Testateur</h1>
      <div className="flex items-center gap-4">
        <Wallet className="w-6 h-6 text-blue-600" />
        <span>{displayAddress}</span>
      </div>
    </header>
  );
}
