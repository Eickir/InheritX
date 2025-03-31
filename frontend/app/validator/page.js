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
import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import ValidatorDashboard from "@/components/shared/Validator";
import NotConnected from "@/components/shared/NotConnected";

export default function Validator() {

    const {address, isConnected} = useAccount();
 
      return (
        <>
          {isConnected ? <ValidatorDashboard /> : <NotConnected />}
        </>
      );
    }

