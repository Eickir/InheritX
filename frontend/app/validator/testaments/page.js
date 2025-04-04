"use client";
import { useAccount } from "wagmi";
import NotConnected from "@/components/shared/NotConnected";
import ValidatorTestament from "@/components/shared/validator_dashboard/dashboard/Testaments";

export default function Testaments() {

    const {address, isConnected} = useAccount();

    return (

    <>
    {isConnected ? <ValidatorTestament /> : <NotConnected />}
    </>

    )

}
