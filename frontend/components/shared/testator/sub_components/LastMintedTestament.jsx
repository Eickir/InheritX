import { useAccount, useReadContract } from "wagmi";

import { testamentManagerAddress, testamentManagerABI } from "@/constants";

export default function LastMintedTestament({ setRefetchFn }) {
  const { address, isConnected } = useAccount();

  const {
    data: testament,
    isLoading,
    isError,
    error,
    refetch,
  } = useReadContract({
    address: testamentManagerAddress,
    abi: testamentManagerABI,
    functionName: "getMintedTestament",
    account: address,
  });

  // Permet au parent de déclencher le refetch via ref
  if (setRefetchFn) {
    setRefetchFn(() => refetch);
  }

  if (isLoading) {
    return <p className="text-gray-500 italic text-sm">Chargement...</p>;
  }

  if (isError || !testament) {
    return (
      <p className="text-gray-500 italic text-sm">
        {error?.message?.includes("NoTestamentFound")
          ? "Aucun testament minté trouvé."
          : "Erreur lors de la récupération du testament."}
      </p>
    );
  }

  const [tokenId, tokenURI] = testament;

  return (
    <div className="space-y-2 text-sm text-gray-700">
      <div className="flex items-start gap-1">
        <span className="font-medium text-gray-600">Token ID:</span>
        <span>{tokenId.toString()}</span>
      </div>

      <div className="flex items-start gap-1">
        <span className="font-medium text-gray-600">Token URI:</span>
        <a
          href={tokenURI}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline break-all"
        >
          {tokenURI}
        </a>
      </div>
    </div>
  );
}
