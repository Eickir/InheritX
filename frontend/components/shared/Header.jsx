"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";


const Header = () => {

const pathname = usePathname();
const isEligible = pathname.startsWith("/testament");

  return (
<header className="sticky top-0 z-50 bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between">
  <Link href="/">
    <p className="text-2xl font-bold text-white">InheritX</p>
  </Link>
  <nav className="space-x-4">
    <a href="#features" className="text-gray-300 hover:text-blue-400">Fonctionnalités</a>
    <a href="#about" className="text-gray-300 hover:text-blue-400">À propos</a>
    <a href="#contact" className="text-gray-300 hover:text-blue-400">Contact</a>
  </nav>
  {isEligible && <ConnectButton />}
</header>
  )
}

export default Header
