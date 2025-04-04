"use client";
import { useState, useEffect, createContext, useContext } from "react";
import { Button } from "@/components/ui/button";
import { useAccount, useReadContract } from "wagmi";
import { validatorPoolABI, validatorPoolAddress } from "@/constants";
import { formatUnits } from "viem";

// Contexte pour partager les infos entre les sous-composants
const StakeContext = createContext();

export default function EnterPool({ onStake, children }) {
  const [stakeAmount, setStakeAmount] = useState("0");
  const { address } = useAccount();

  const { data: minStakeAmount } = useReadContract({
    address: validatorPoolAddress,
    abi: validatorPoolABI,
    functionName: "minStakeAmount",
    account: address,
    watch: true,
  });

  useEffect(() => {
    if (minStakeAmount) {
      const formatted = formatUnits(minStakeAmount, 18);
      setStakeAmount(formatted);
    }
  }, [minStakeAmount]);

  const handleStakeClick = () => {
    if (onStake && stakeAmount) {
      onStake(stakeAmount);
    }
  };

  return (
    <StakeContext.Provider value={{ stakeAmount, handleStakeClick }}>
      {children}
    </StakeContext.Provider>
  );
}

// Sous-composant : Infos (gauche)
EnterPool.Info = function Info() {
  const { stakeAmount } = useContext(StakeContext);
  return (
    <>
      <h3 className="text-lg font-semibold mb-2">Montant requis</h3>
      <p className="text-gray-700">
        Pour rejoindre le réseau de validateurs, vous devez staker :
      </p>
      <p className="text-2xl font-bold mt-2">{stakeAmount} INHX</p>
    </>
  );
};

// Sous-composant : Action (droite)
EnterPool.Action = function Action() {
  const { handleStakeClick } = useContext(StakeContext);
  return (
    <div className="flex flex-col h-full justify-between">
      <div>
        <h3 className="text-lg font-semibold mb-2">Action</h3>
        <p className="text-gray-700 mb-4">
          Cliquez sur le bouton ci-dessous pour staker le montant requis et rejoindre le réseau.
        </p>
      </div>
      <Button onClick={handleStakeClick} className="w-full mt-auto">
        Rejoindre le réseau
      </Button>
    </div>
  );
};
