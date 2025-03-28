"use client";
import Head from "next/head";
import Files from "@/components/shared/Files";
import { useAccount } from "wagmi";
import NewUser from "@/components/shared/NewUser";
import NotConnected from "@/components/shared/NotConnected";

export default function Login() {

    const {isConnected, address} = useAccount();
    
    return (

        <>
            {isConnected ? (
            <NewUser/>
            ) : 
            <NotConnected/>
        }
            
        </>


    );
}
