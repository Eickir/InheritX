"use client";
import Head from "next/head";
import Files from "@/components/shared/Files";
import {
    testamentManagerABI,
    testamentManagerAddress,
    inhxAddress,
    inhxABI,
    musdtAddress,
    musdtABI,
    poolAddress, 
    poolABI
  } from "@/constants";
import { parseAbiItem } from 'viem'
import { publicClient } from '@/utils/client'
import ValidatorDashboard from "@/components/shared/Validator";
import { useState, useEffect } from "react";
import { useAccount } from "wagmi";

export default function Validator() {

 
    return (

    <>
    <ValidatorDashboard/>
    </>

    )

}
