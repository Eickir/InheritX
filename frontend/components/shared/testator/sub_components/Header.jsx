// Header.jsx
"use client";

export default function Header({ address, onOpenSwap }) {
  const displayTitle = address
    ? `${address.slice(0, 6)}...${address.slice(-4)} dashboard`
    : "Dashboard";

  return (
    <header className="bg-white shadow px-4 py-6 flex justify-between items-center">
      <h1 className="text-3xl font-bold">{displayTitle}</h1>

      {onOpenSwap && (
        <button
          onClick={onOpenSwap}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium"
        >
          💱 Swap Tokens
        </button>
      )}
    </header>
  );
}
