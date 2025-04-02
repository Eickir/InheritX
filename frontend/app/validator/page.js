"use client";
import { useAccount } from "wagmi";
import NotConnected from "@/components/shared/NotConnected";
import ValidatorDashboard from "@/components/shared/validator_dashboard/ValidatorDashboard";

export default function Validator() {
  const { address, isConnected } = useAccount();

  return (
    <>
      {isConnected ? <ValidatorDashboard /> : <NotConnected />}
    </>
  );
}
