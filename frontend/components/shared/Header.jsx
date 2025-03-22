import Link from "next/link";

const Header = () => {
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
</header>
  )
}

export default Header
