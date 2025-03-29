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
import TestamentUploader from "@/components/shared/TestamentUpload";
import { useState, useEffect } from "react";
import { useAccount } from "wagmi";

export default function Testator() {

    const [events, setEvents] = useState([]);
    const {address, isConnectec} = useAccount();

    const getEvents = async() => {

        // Logs des events 
        const TestamentDepositedLogs = await publicClient.getLogs({
          address: testamentManagerAddress, 
          event: parseAbiItem('event TestamentDeposited(address indexed _depositor, string _cid)'), 
          fromBlock: 22123608n
        })

        const SwapLogs = await publicClient.getLogs({
            address: poolAddress, 
            account: address,
            event: parseAbiItem('event TokenSwapped(string _tokenSent, string _tokenReceived, uint256 _balanceBeforeTokenReceived, uint256 _balanceAfterTokenReceived)'), 
            fromBlock:  22123608n
          })


    
        // Formats des events 
        const formattedTestamentDepositedLogs = TestamentDepositedLogs.map((log) => ({
          type: "TestamentDeposited", 
          _depositor: log.args._depositor,
          transactionHash: log.transactionHash,
          blockNumber: log.blockNumber.toString(),
      })); 


      // Formats des events 
      const formattedSwapLogs = SwapLogs.map((log) => ({
        type: "SwapToken", 
        _tokenSent: log.args._tokenSent,
        _tokenReceived: log.args._tokenReceived,
        _balanceBeforeTokenReceived: log.args._balanceBeforeTokenReceived,
        _balanceAfterTokenReceived: log.args._balanceAfterTokenReceived,
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber.toString(),
    
        })); 
    
      // Combine and sort the logs by block number for chronological order
      const combinedEvents = [...formattedTestamentDepositedLogs,...formattedSwapLogs].sort(
        (a, b) => Number(b.blockNumber) - Number(a.blockNumber)
      );
    
      setEvents(combinedEvents);
    
      }
    
      useEffect(() => {
        const getAllEvents = async () => {
            await getEvents();
        }
        getAllEvents()
    }, [])
    

    return (

    <>
    <TestamentUploader my_events={getEvents}/>
    </>

    )

}
