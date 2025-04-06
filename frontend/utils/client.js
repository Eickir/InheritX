import { createPublicClient, http } from "viem";
import {hardhat, sepolia} from "viem/chains";
import dotenv from "dotenv";

dotenv.config();


export const hardhatClient = createPublicClient({
    chain: hardhat, 
    transport: http("http://127.0.0.1:8545"),
})

export const sepoliaClient = createPublicClient({
    chain: sepolia, 
    transport: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL),
})

// Décommenter hardhatClient pour la présentation en local
export const publicClient = sepoliaClient;
//export const publicClient = hardhatClient;