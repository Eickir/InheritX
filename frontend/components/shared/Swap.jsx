"use client";
import { useEffect, useState } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseUnits, formatUnits } from "viem";
import {
  poolABI,
  poolAddress,
  musdtABI,
  musdtAddress,
  inhxABI,
  inhxAddress,
  routerABI, 
  routerAddress
} from "@/constants";

export default function SwapComponent({ onTransactionSuccess }) {
  const { address } = useAccount();
  const decimals = 18;

  const [inputAmount, setInputAmount] = useState("0");
  const [isMUSDTToINHX, setIsMUSDTToINHX] = useState(true);
  const [loading, setLoading] = useState(false);
  const [estimatedAmountOut, setEstimatedAmountOut] = useState("0");
  const [minimumReceived, setMinimumReceived] = useState("0");
  const [slippage, setSlippage] = useState(0.5);
  const [approveHash, setApproveHash] = useState(null);
  const [swapHash, setSwapHash] = useState(null);

  const { data: writeApproveData, writeContract: writeApproveFunction } = useWriteContract();
  const { data: writeSwapData, writeContract: writeSwapFunction } = useWriteContract();

  const { data: balanceMUSDT, refetch: refetchMUSDTBalance } = useReadContract({
    address: musdtAddress,
    abi: musdtABI,
    account: address,
    functionName: "balanceOf",
    args: [address],
  });

  const { data: balanceINHX, refetch: refetchINHXBalance } = useReadContract({
    address: inhxAddress,
    abi: inhxABI,
    account: address,
    functionName: "balanceOf",
    args: [address],
  });

  const { data: reserves } = useReadContract({
    address: poolAddress,
    abi: poolABI,
    functionName: "getReserves",
  });

  const { isSuccess: isApproveConfirmed } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  const { isSuccess: isSwapConfirmed } = useWaitForTransactionReceipt({
    hash: swapHash,
  });

  useEffect(() => {
    if (writeApproveData) {
      console.log("✅ Approve tx envoyée. Hash:", writeApproveData);
      setApproveHash(writeApproveData);
    }
  }, [writeApproveData]);

  useEffect(() => {
    if (isApproveConfirmed && approveHash) {
      console.log("✅ Approve confirmée. Lancement du swap...");
      handleSwap();
    }
  }, [isApproveConfirmed, approveHash]);

  useEffect(() => {
    if (isSwapConfirmed && swapHash) {
      console.log("✅ Swap confirmé !");
      setSwapHash(null);
      setLoading(false);
      refetchINHXBalance();
      refetchMUSDTBalance();
      onTransactionSuccess?.();
    }
  }, [isSwapConfirmed, swapHash]);

  const getTokenLabels = () =>
    isMUSDTToINHX ? { from: "MUSDT", to: "INHX" } : { from: "INHX", to: "MUSDT" };

  const { from, to } = getTokenLabels();

  const flipTokens = () => {
    setIsMUSDTToINHX((prev) => !prev);
    setInputAmount("0");
    setEstimatedAmountOut("0");
    setMinimumReceived("0");
  };

  function getAmountOut(amountIn, reserveIn, reserveOut) {
    const amountInWithFee = amountIn * 997n;
    const numerator = amountInWithFee * reserveOut;
    const denominator = reserveIn * 1000n + amountInWithFee;
    return numerator / denominator;
  }

  useEffect(() => {
    if (!reserves || !inputAmount || Number(inputAmount) <= 0) {
      setEstimatedAmountOut("0");
      setMinimumReceived("0");
      return;
    }

    try {
      const amountIn = parseUnits(inputAmount, decimals);
      const reserveA = reserves[0];
      const reserveB = reserves[1];

      const [reserveIn, reserveOut] = isMUSDTToINHX
        ? [reserveA, reserveB]
        : [reserveB, reserveA];

      const out = getAmountOut(amountIn, reserveIn, reserveOut);
      const formattedOut = formatUnits(out, decimals);

      setEstimatedAmountOut(formattedOut);

      const slippageMultiplier = (100 - slippage) / 100;
      const minOut = Number(formattedOut) * slippageMultiplier;
      setMinimumReceived(minOut.toFixed(6));
    } catch (e) {
      setEstimatedAmountOut("0");
      setMinimumReceived("0");
    }
  }, [inputAmount, reserves, isMUSDTToINHX, slippage]);

  const swap = async () => {
    try {
      setLoading(true);
      const amountIn = parseUnits(inputAmount, decimals);
      const tokenInAddress = isMUSDTToINHX ? musdtAddress : inhxAddress;

      await writeApproveFunction({
        address: tokenInAddress,
        abi: isMUSDTToINHX ? musdtABI : inhxABI,
        functionName: "approve",
        args: [routerAddress, amountIn],
        account: address,
      });

      // Approve hash will be tracked by useEffect above
    } catch (err) {
      console.error("❌ Approve failed:", err);
      alert("Approve failed: " + (err?.message || JSON.stringify(err)));
      setLoading(false);
    }
  };

  const handleSwap = async () => {
    try {
      const amountIn = parseUnits(inputAmount, decimals);
      const amountOut = parseUnits(estimatedAmountOut, decimals);
      const deadline = Math.floor(Date.now() / 1000) + 600;
  
      const slippageTolerance = BigInt(Math.floor((100 - slippage) * 1000));
      const amountOutMin = (amountOut * slippageTolerance) / 100000n;
  
      const path = isMUSDTToINHX
        ? [musdtAddress, inhxAddress]
        : [inhxAddress, musdtAddress];
  
      const tx = await writeSwapFunction({
        address: routerAddress,
        abi: routerABI,
        functionName: "swapExactTokensForTokens",
        args: [amountIn, amountOutMin, path, address, deadline],
        account: address,
      });
  
      console.log("✅ Swap tx envoyée. Hash:", tx);
      setSwapHash(tx);
    } catch (err) {
      console.error("❌ Swap failed:", err);
      alert("Swap failed: " + (err?.message || JSON.stringify(err)));
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (writeSwapData) {
      console.log("✅ Swap tx envoyée. Hash:", writeSwapData);
      setSwapHash(writeSwapData);
    }
  }, [writeSwapData]);
  
  
  
  
  return (
    <div className="p-6 bg-white rounded-xl shadow-md max-w-md mx-auto space-y-4">
      <h2 className="text-2xl font-bold text-center">
        Swap {from} ➔ {to}
      </h2>

      <div className="space-y-2">
        <label className="block text-sm font-semibold">From ({from})</label>
        <input
          type="number"
          min="0"
          value={inputAmount}
          onChange={(e) => setInputAmount(e.target.value)}
          className="border px-4 py-2 rounded w-full"
          placeholder={`Amount of ${from}`}
        />
      </div>

      <div className="flex justify-center">
        <button
          onClick={flipTokens}
          className="text-blue-600 hover:underline font-medium"
        >
          🔄 Flip
        </button>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-semibold">To ({to})</label>
        <input
          type="text"
          disabled
          value={estimatedAmountOut}
          className="bg-gray-100 px-4 py-2 rounded w-full"
        />
        <p className="text-xs text-gray-500">
          Minimum received (after {slippage.toFixed(2)}% slippage): {minimumReceived} {to}
        </p>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-semibold">
          Slippage: {slippage.toFixed(2)}%
        </label>
        <input
          type="range"
          min="0.1"
          max="5"
          step="0.1"
          value={slippage}
          onChange={(e) => setSlippage(parseFloat(e.target.value))}
          className="w-full"
        />
      </div>

      <button
        onClick={swap}
        disabled={loading || !inputAmount || Number(inputAmount) <= 0}
        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded w-full font-bold"
      >
        {loading ? "Processing..." : `Swap ${from} ➔ ${to}`}
      </button>

      <div className="text-xs text-gray-500 mt-4">
        <div>💰 Your MUSDT: {balanceMUSDT && formatUnits(balanceMUSDT, decimals)}</div>
        <div>💰 Your INHX: {balanceINHX && formatUnits(balanceINHX, decimals)}</div>
      </div>
    </div>
  );
}


