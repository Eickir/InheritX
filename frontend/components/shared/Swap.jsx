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
} from "@/constants";

export default function SwapComponent() {
  const { address } = useAccount();
  const { writeContract } = useWriteContract();

  const [inputAmount, setInputAmount] = useState("0");
  const [isMUSDTToINHX, setIsMUSDTToINHX] = useState(true);
  const [loading, setLoading] = useState(false);
  const [estimatedAmountOut, setEstimatedAmountOut] = useState("0");

  const decimals = 18;

  const {
    data: writeApprove,
    isError: isWriteApproveError,
    isLoading: isWriteApproveLoading,
    isSuccess: isWriteApproveSuccess,
    writeContract: writeApproveFunction,
  } = useWriteContract();

  const {
    data: writeSwap,
    isError: isWriteError,
    isLoading: isWriteLoading,
    isSuccess: isWriteSuccess,
    writeContract: writeSwapFunction,
  } = useWriteContract();

  const { data: balanceMUSDT, refetch: refetchMUSDTBalance } = useReadContract({
    address: musdtAddress,
    abi: musdtABI,
    functionName: "balanceOf",
    args: [address],
  });

  const { data: balanceINHX, refetch: refetchINHXBalance } = useReadContract({
    address: inhxAddress,
    abi: inhxABI,
    functionName: "balanceOf",
    args: [address],
  });

  const getTokenLabels = () =>
    isMUSDTToINHX ? { from: "MUSDT", to: "INHX" } : { from: "INHX", to: "MUSDT" };

  const swap = async () => {
    try {
      setLoading(true);
      const amountIn = parseUnits(inputAmount, decimals);
      const deadline = Math.floor(Date.now() / 1000) + 600;

      const tokenInAddress = isMUSDTToINHX ? musdtAddress : inhxAddress;
      const swapFunction = isMUSDTToINHX
        ? "swapTokenBForTokenA"
        : "swapTokenAForTokenB";

      writeApproveFunction({
        address: tokenInAddress,
        abi: isMUSDTToINHX ? musdtABI : inhxABI,
        functionName: "approve",
        args: [poolAddress, amountIn],
        account: address,
      });

      writeSwapFunction({
        address: poolAddress,
        abi: poolABI,
        functionName: swapFunction,
        args: [amountIn, 0n, deadline],
        account: address,
      });

      setLoading(false);
    } catch (err) {
      console.error("Swap failed:", err);
      setLoading(false);
    }
  };

  const { data: reserves } = useReadContract({
    address: poolAddress,
    abi: poolABI,
    functionName: "getReserves",
  });

  function getAmountOut(amountIn, reserveIn, reserveOut) {
    const amountInWithFee = amountIn * 997n;
    const numerator = amountInWithFee * reserveOut;
    const denominator = reserveIn * 1000n + amountInWithFee;
    return numerator / denominator;
  }

  const { isPending, isSuccess, isError } = useWaitForTransactionReceipt({
    hash: writeSwap,
  });

  useEffect(() => {
    if (writeSwap && isSuccess) {
      refetchINHXBalance();
      refetchMUSDTBalance();
    }
  }, [writeSwap, isSuccess]);

  const flipTokens = () => {
    setIsMUSDTToINHX((prev) => !prev);
    setInputAmount("0");
  };

  const { from, to } = getTokenLabels();

  useEffect(() => {
    if (!reserves || !inputAmount || Number(inputAmount) <= 0) {
      setEstimatedAmountOut("0");
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
      setEstimatedAmountOut(formatUnits(out, decimals));
    } catch (e) {
      setEstimatedAmountOut("0");
    }
  }, [inputAmount, reserves, isMUSDTToINHX]);

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
      </div>

      <button
        onClick={swap}
        disabled={loading || !inputAmount || Number(inputAmount) <= 0}
        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded w-full font-bold"
      >
        {loading ? "Swapping..." : `Swap ${from} ➔ ${to}`}
      </button>

      <div className="text-xs text-gray-500 mt-4">
        <div>💰 Your MUSDT: {balanceMUSDT && formatUnits(balanceMUSDT, decimals)}</div>
        <div>💰 Your INHX: {balanceINHX && formatUnits(balanceINHX, decimals)}</div>
      </div>
    </div>
  );
}