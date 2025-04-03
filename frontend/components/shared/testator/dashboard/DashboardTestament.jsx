"use client";
import Head from "next/head";
import { useEffect, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import DashboardMetrics from "../sub_components/DashboardMetrics";
import DepositTestamentForm from "../sub_components/DepositTestamentForm";
import LastTestament from "../sub_components/LastTestament";
import DecryptionSection from "../sub_components/DecryptionSection";
import EventLogList from "@/components/shared/Events";
import TestamentStatusTable from "@/components/shared/testator/sub_components/TestamentStatusTable";
import SwapModalWrapper from "@/components/shared/SwapModalWraper";
import { Card, CardContent } from "@/components/ui/card";

import {
  inhxAddress,
  inhxABI,
  musdtAddress,
  musdtABI,
  testamentManagerAddress,
  testamentManagerABI,
  poolAddress,
} from "@/constants";

import { publicClient } from "@/utils/client";
import { parseAbiItem } from "viem";
import ResponsivePieChart from "../sub_components/TestamentPieChart";

export default function DashboardTestament() {
  const { address, isConnected } = useAccount();

  useEffect(() => {
    if (typeof window !== "undefined" && window.__setSwapSuccessCallback) {
      window.__setSwapSuccessCallback(handleSwapSuccess);
    }
  }, []);

  const [showSwap, setShowSwap] = useState(false);
  const [events, setEvents] = useState([]);
  const [localTestamentInfo, setLocalTestamentInfo] = useState(null);
  const [inhxBalance, setInhxBalance] = useState(null);
  const [musdtBalance, setMusdtBalance] = useState(null);

  const { data: balanceINHX, refetch: refetchINHXBalance } = useReadContract({
    address: inhxAddress,
    abi: inhxABI,
    functionName: "balanceOf",
    args: [address],
    watch: true,
    account: address,
  });

  const { data: balanceMUSDT, refetch: refetchMUSDTBalance } = useReadContract({
    address: musdtAddress,
    abi: musdtABI,
    functionName: "balanceOf",
    args: [address],
    watch: true,
    account: address,
  });

  const { refetch: refetchTestamentInfo } = useReadContract({
    address: testamentManagerAddress,
    abi: testamentManagerABI,
    functionName: "getTestament",
    args: [address],
    watch: true,
    account: address,
  });

  const { data: testamentCount, refetch: refetchTestamentCount } = useReadContract({
    address: testamentManagerAddress,
    abi: testamentManagerABI,
    functionName: "getTestamentsNumber",
    args: [address],
    watch: true,
    account: address,
  });

  const getEvents = async () => {
    try {
      const logs = await Promise.all([
        publicClient.getLogs({
          address: testamentManagerAddress,
          event: parseAbiItem("event TestamentDeposited(address indexed _depositor, string _cid)"),
          fromBlock: 22123608n,
        }),
        publicClient.getLogs({
          address: poolAddress,
          event: parseAbiItem("event TokenSwapped(string _tokenSent, string _tokenReceived, uint256 _balanceBeforeTokenReceived, uint256 _balanceAfterTokenReceived)"),
          fromBlock: 22123608n,
        }),
        publicClient.getLogs({
          address: testamentManagerAddress,
          event: parseAbiItem("event TestamentApproved(address indexed _depositor, string _cid)"),
          fromBlock: 22123608n,
        }),
        publicClient.getLogs({
          address: testamentManagerAddress,
          event: parseAbiItem("event TestamentRejected(address indexed _depositor, string _cid)"),
          fromBlock: 22123608n,
        }),
        publicClient.getLogs({
          address: testamentManagerAddress,
          event: parseAbiItem("event TestamentOutdated(address indexed _depositor, string _cid)"),
          fromBlock: 22123608n,
        }),
      ]);

      const [deposits, swaps, approvals, rejections, outdated] = logs;

      const enrichWithTimestamp = async (logs, type) => {
        return Promise.all(
          logs.map(async (log) => {
            const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
            return {
              type,
              _depositor: log.args._depositor,
              cid: log.args._cid,
              transactionHash: log.transactionHash,
              blockNumber: log.blockNumber.toString(),
              timestamp: Number(block.timestamp),
            };
          })
        );
      };

      const enrichedDeposits = await enrichWithTimestamp(deposits, "TestamentDeposited");
      const enrichedApprovals = await enrichWithTimestamp(approvals, "TestamentApproved");
      const enrichedRejections = await enrichWithTimestamp(rejections, "TestamentRejected");
      const enrichedOutdated = await enrichWithTimestamp(outdated, "TestamentOutdated");

      const formattedSwapLogs = swaps.map((log) => ({
        type: "SwapToken",
        _tokenSent: log.args._tokenSent,
        _tokenReceived: log.args._tokenReceived,
        _balanceBeforeTokenReceived: log.args._balanceBeforeTokenReceived,
        _balanceAfterTokenReceived: log.args._balanceAfterTokenReceived,
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber.toString(),
      }));

      const combinedEvents = [
        ...enrichedDeposits,
        ...enrichedApprovals,
        ...enrichedRejections,
        ...enrichedOutdated,
        ...formattedSwapLogs,
      ].sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber));

      setEvents(combinedEvents);
    } catch (error) {
      console.error("Erreur lors de la récupération des événements :", error);
    }
  };

  const handleSwapSuccess = async () => {
    const inhx = await refetchINHXBalance();
    const musdt = await refetchMUSDTBalance();
    setInhxBalance(inhx.data);
    setMusdtBalance(musdt.data);
    getEvents();
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.__onSwapSuccessFromDashboard = handleSwapSuccess;
    }
  }, []);

  const handleDepositSuccess = async () => {
    const { data: newTestament } = await refetchTestamentInfo();
    setLocalTestamentInfo(newTestament);
    const inhx = await refetchINHXBalance();
    const musdt = await refetchMUSDTBalance();
    setInhxBalance(inhx.data);
    setMusdtBalance(musdt.data);
    refetchTestamentCount();
    getEvents();
  };

  useEffect(() => {
    if (!address) return;

    const fetchData = async () => {
      const { data: fetchedTestamentInfo } = await refetchTestamentInfo();
      setLocalTestamentInfo(fetchedTestamentInfo);
      const inhx = await refetchINHXBalance();
      const musdt = await refetchMUSDTBalance();
      setInhxBalance(inhx.data);
      setMusdtBalance(musdt.data);
      refetchTestamentCount();
      getEvents();
    };

    fetchData();
  }, [address]);

  const metrics = DashboardMetrics({
    testamentCount,
    testamentInfo: localTestamentInfo,
    balanceINHX: inhxBalance,
    balanceMUSDT: musdtBalance,
  });

  return (
    <>
      <Head>
        <title>{address ? `${address.slice(0, 6)}...${address.slice(-4)} dashboard` : "Dashboard"}</title>
        <meta name="description" content="Dashboard complet pour gérer votre testament sur la blockchain" />
      </Head>

      <div className="flex flex-col min-h-screen bg-gray-50">
        <main className="flex-1 p-4 space-y-8">
          {/* Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {metrics.map((metric, index) => (
              <Card key={index}>
                <CardContent className="flex flex-col items-center p-4">
                  <span className="text-sm text-gray-600">{metric.label}</span>
                  <span className="text-2xl font-bold">{metric.value}</span>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Section principale */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px] flex-1 overflow-hidden">
            {/* Colonne gauche */}
            <div className="lg:col-span-5 flex flex-col space-y-4 h-full">
              <Card className="flex-1">
                <CardContent className="p-4 h-full">
                  <LastTestament testamentInfo={localTestamentInfo} />
                </CardContent>
              </Card>
              <Card className="flex-1">
                <CardContent className="p-4 h-full">
                  <ResponsivePieChart events={events} address={address} />
                </CardContent>
              </Card>
            </div>

            {/* Colonne droite */}
            <div className="lg:col-span-7 flex flex-col h-full">
            <Card className="overflow-hidden">
              <div className="p-4 flex flex-col">
                <div
                  className="overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 rounded-md"
                  style={{ maxHeight: "360px", minHeight: "360px" }}
                >
                  <EventLogList events={events} />
                </div>
              </div>
            </Card>
          </div>
          </div>
        </main>
      </div>

      <SwapModalWrapper
        showSwap={showSwap}
        onClose={() => setShowSwap(false)}
        onSwapSuccess={handleSwapSuccess}
      />
    </>
  );
}
