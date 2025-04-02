"use client";
import { useAccount } from "wagmi";
import NotConnected from "@/components/shared/NotConnected";
import DashboardTestament from "@/components/shared/testator/dashboard/DashboardTestament";

export default function Testator() {

    const {address, isConnected} = useAccount();

    return (

    <>
    {isConnected ? <DashboardTestament /> : <NotConnected />}
    </>

    )

}
