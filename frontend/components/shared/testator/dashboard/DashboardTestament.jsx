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
    console.log("🔁 Swap success triggered in Dashboard");
    const inhx = await refetchINHXBalance();
    const musdt = await refetchMUSDTBalance();
    setInhxBalance(inhx.data);
    setMusdtBalance(musdt.data);
    getEvents();
  };

  // Une fois que le layout nous a fourni le setter, on l’utilise
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

  return (
    <>
      <Head>
        <title>{address ? `${address.slice(0, 6)}...${address.slice(-4)} dashboard` : "Dashboard"}</title>
        <meta name="description" content="Dashboard complet pour gérer votre testament sur la blockchain" />
      </Head>

        <div className="flex min-h-screen bg-gray-50">
          <div className="flex-1">
            <main className="p-4 space-y-8">
              <DashboardMetrics
                testamentCount={testamentCount}
                testamentInfo={localTestamentInfo}
                balanceINHX={inhxBalance}
                balanceMUSDT={musdtBalance}
              />

              <DepositTestamentForm
                address={address}
                isConnected={isConnected}
                onDepositSuccess={handleDepositSuccess}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <LastTestament testamentInfo={localTestamentInfo} />
                <DecryptionSection />
              </div>

              <section>
                <TestamentStatusTable events={events} address={address} />
              </section>

              <section>
                <EventLogList events={events} />
              </section>
            </main>
          </div>
        </div>

      <SwapModalWrapper
        showSwap={showSwap}
        onClose={() => setShowSwap(false)}
        onSwapSuccess={handleSwapSuccess}
      />
    </>
  );
}
