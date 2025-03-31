"use client";
import Head from "next/head";
import { useEffect, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import Sidebar from "./Sidebar";
import Header from "./Header";
import DashboardMetrics from "./DashboardMetrics";
import DepositTestamentForm from "./DepositTestamentForm";
import LastTestament from "./LastTestament";
import DecryptionSection from "./DecryptionSection";
import EventLogList from "@/components/shared/Events";

import {
  inhxAddress,
  inhxABI,
  musdtAddress,
  musdtABI,
  testamentManagerAddress,
  testamentManagerABI,
  poolAddress,
  poolABI,
} from "@/constants";

import { publicClient } from "@/utils/client";
import { parseAbiItem, formatUnits } from "viem";

export default function DashboardTestament({ my_events }) {
  const { address, isConnected } = useAccount();
  const [events, setEvents] = useState([]);

  // Lecture des soldes INHX et MUSDT
  const { data: balanceINHX, refetch: refetchINHXBalance } = useReadContract({
    address: inhxAddress,
    abi: inhxABI,
    functionName: "balanceOf",
    args: [address],
    account: address,
  });

  const { data: balanceMUSDT, refetch: refetchMUSDTBalance } = useReadContract({
    address: musdtAddress,
    abi: musdtABI,
    functionName: "balanceOf",
    args: [address],
    account: address,
  });

  // Lecture des informations du testament
  const { data: testamentInfo, refetch: refetchTestamentInfo } = useReadContract({
    address: testamentManagerAddress,
    abi: testamentManagerABI,
    functionName: "getTestament",
    args: [address],
    account: address,
  });

  // Lecture du nombre de testaments déposés
  const { data: testamentCount, refetch: refetchTestamentCount } = useReadContract({
    address: testamentManagerAddress,
    abi: testamentManagerABI,
    functionName: "getTestamentsNumber",
    args: [address],
    account: address,
  });

  // Fonction pour récupérer l'ensemble des logs d'événements
  const getEvents = async () => {
    try {
      // Récupération des logs de dépôt de testament
      const TestamentDepositedLogs = await publicClient.getLogs({
        address: testamentManagerAddress,
        event: parseAbiItem(
          "event TestamentDeposited(address indexed _depositor, string _cid)"
        ),
        fromBlock: 22123608n,
      });

      // Récupération des logs de swap de tokens
      const SwapLogs = await publicClient.getLogs({
        address: poolAddress,
        event: parseAbiItem(
          "event TokenSwapped(string _tokenSent, string _tokenReceived, uint256 _balanceBeforeTokenReceived, uint256 _balanceAfterTokenReceived)"
        ),
        fromBlock: 22123608n,
      });

      // Récupération des logs d'approbation de testament
      const TestamentApprovedLogs = await publicClient.getLogs({
        address: testamentManagerAddress,
        event: parseAbiItem(
          "event TestamentApproved(address indexed _depositor, string _cid)"
        ),
        fromBlock: 22123608n,
      });

      // Récupération des logs de rejet de testament
      const TestamentRejectedLogs = await publicClient.getLogs({
        address: testamentManagerAddress,
        event: parseAbiItem(
          "event TestamentRejected(address indexed _depositor, string _cid)"
        ),
        fromBlock: 22123608n,
      });

      // Formatage des logs
      const formattedTestamentDepositedLogs = TestamentDepositedLogs.map((log) => ({
        type: "TestamentDeposited",
        _depositor: log.args._depositor,
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber.toString(),
      }));

      const formattedSwapLogs = SwapLogs.map((log) => ({
        type: "SwapToken",
        _tokenSent: log.args._tokenSent,
        _tokenReceived: log.args._tokenReceived,
        _balanceBeforeTokenReceived: log.args._balanceBeforeTokenReceived,
        _balanceAfterTokenReceived: log.args._balanceAfterTokenReceived,
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber.toString(),
      }));

      const formattedTestamentApprovedLogs = TestamentApprovedLogs.map((log) => ({
        type: "TestamentApproved",
        _depositor: log.args._depositor,
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber.toString(),
      }));

      const formattedTestamentRejectedLogs = TestamentRejectedLogs.map((log) => ({
        type: "TestamentRejected",
        _depositor: log.args._depositor,
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber.toString(),
      }));

      const combinedEvents = [
        ...formattedTestamentDepositedLogs,
        ...formattedTestamentRejectedLogs,
        ...formattedTestamentApprovedLogs,
        ...formattedSwapLogs,
      ].sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber));

      setEvents(combinedEvents);
    } catch (error) {
      console.error("Erreur lors de la récupération des événements :", error);
    }
  };

  // Effet pour charger les données et les événements
  useEffect(() => {
    if (!address) return;
    const fetchData = async () => {
      await getEvents();
      refetchINHXBalance();
      refetchMUSDTBalance();
      refetchTestamentInfo();
      refetchTestamentCount();
    };
    fetchData();
    // Vous pouvez ajouter d'autres dépendances (ex : writeData) pour rafraîchir en cas de modification
  }, [address]);

  return (
    <>
      <Head>
        <title>Tableau de Bord - Testateur</title>
        <meta
          name="description"
          content="Dashboard complet pour gérer votre testament sur la blockchain"
        />
      </Head>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1">
          <Header address={address} />
          <main className="p-4 space-y-8">
            <DashboardMetrics
              testamentCount={testamentCount}
              testamentInfo={testamentInfo}
              balanceINHX={balanceINHX}
              balanceMUSDT={balanceMUSDT}
            />
            <DepositTestamentForm address={address} isConnected={isConnected} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <LastTestament testamentInfo={testamentInfo} />
              <DecryptionSection />
            </div>
            <section>
              <EventLogList events={events} />
            </section>
          </main>
        </div>
      </div>
    </>
  );
}
