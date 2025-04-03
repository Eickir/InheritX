"use client";
import { useAccount } from "wagmi";
import NotConnected from "@/components/shared/NotConnected";
import MesTestaments from "@/components/shared/testator/dashboard/MesTestaments";

export default function Testaments() {

    const {address, isConnected} = useAccount();

    return (

    <>
    {isConnected ? <MesTestaments /> : <NotConnected />}
    </>

    )

}
