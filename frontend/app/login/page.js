"use client";
import Head from "next/head";
import Files from "@/components/shared/Files";
import { useAccount, useReadContract } from "wagmi";
import NewUser from "@/components/shared/NewUser";
import NotConnected from "@/components/shared/NotConnected";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { testamentManagerABI, testamentManagerAddress } from "@/constants";

export default function Login() {
  const { isConnected, address } = useAccount();
  const router = useRouter();

  const { data: TestamentInfo, isLoading } = useReadContract({
    address: testamentManagerAddress,
    abi: testamentManagerABI,
    functionName: "getTestament",
    args: [address],
    account: address,
  });

  useEffect(() => {
    if (!isConnected || isLoading || TestamentInfo === undefined) return;

    const cid = TestamentInfo?.cid;
    const hasTestament = typeof cid === "string" && cid.trim().length > 0;

    if (hasTestament) {
      router.push("/testator");
    }
  }, [isConnected, TestamentInfo, isLoading, router]);

  // Affichage conditionnel
  if (!isConnected) return <NotConnected />;
  if (isLoading || TestamentInfo === undefined) return <div>Chargement...</div>;

  const cid = TestamentInfo?.cid;
  const hasTestament = typeof cid === "string" && cid.trim().length > 0;

  return hasTestament ? null : <NewUser />;
}

