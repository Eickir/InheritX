"use client";
import Head from "next/head";
import { useEffect, useRef, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import DashboardMetrics from "../sub_components/DashboardMetrics";
import LastTestament from "../sub_components/LastTestament";
import EventLogList from "@/components/shared/Events";
import SwapModalWrapper from "@/components/shared/SwapModalWraper";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollText } from "lucide-react";
import LastMintedTestament from "../sub_components/LastMintedTestament";
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

  const [showSwap, setShowSwap] = useState(false);
  const [events, setEvents] = useState([]);
  const [localTestamentInfo, setLocalTestamentInfo] = useState(null);
  const [inhxBalance, setInhxBalance] = useState(null);
  const [musdtBalance, setMusdtBalance] = useState(null);
  const mintedRefetchRef = useRef(null);
  const lastBlockRef = useRef(22123608);

  useEffect(() => {
    if (typeof window !== "undefined" && window.__setSwapSuccessCallback) {
      window.__setSwapSuccessCallback(handleSwapSuccess);
    }
  }, []);

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
    watch: true,
    account: address,
  });

  const { data: testamentCount, refetch: refetchTestamentCount } = useReadContract({
    address: testamentManagerAddress,
    abi: testamentManagerABI,
    functionName: "getTestamentsNumber",
    watch: true,
    account: address,
  });

  const getEvents = async () => {
    try {
      const fromBlock = BigInt(lastBlockRef.current + 1);

      const eventsToWatch = [
        {
          type: "TestamentDeposited",
          address: testamentManagerAddress,
          abi: "event TestamentDeposited(address indexed _depositor, string _cid)",
          format: (log) => ({
            type: "TestamentDeposited",
            _depositor: log.args._depositor,
            cid: log.args._cid,
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber.toString(),
          }),
        },
        {
          type: "SwapToken",
          address: poolAddress,
          abi: "event TokenSwapped(string _tokenSent, string _tokenReceived, uint256 _balanceBeforeTokenReceived, uint256 _balanceAfterTokenReceived)",
          format: (log) => ({
            type: "SwapToken",
            _tokenSent: log.args._tokenSent,
            _tokenReceived: log.args._tokenReceived,
            _balanceBeforeTokenReceived: log.args._balanceBeforeTokenReceived,
            _balanceAfterTokenReceived: log.args._balanceAfterTokenReceived,
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber.toString(),
          }),
        },
        {
          type: "TestamentApproved",
          address: testamentManagerAddress,
          abi: "event TestamentApproved(address indexed _depositor, string _cid)",
          format: (log) => ({
            type: "TestamentApproved",
            _depositor: log.args._depositor,
            cid: log.args._cid,
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber.toString(),
          }),
        },
        {
          type: "TestamentMinted",
          address: testamentManagerAddress,
          abi: "event TestamentMinted(address indexed to, uint256 indexed tokenId, string cid)",
          format: (log) => ({
            type: "TestamentMinted",
            to: log.args.to,
            tokenId: log.args.tokenId,
            cid: log.args.cid,
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber.toString(),
          }),
        },
        {
          type: "TestamentRejected",
          address: testamentManagerAddress,
          abi: "event TestamentRejected(address indexed _depositor, string _cid)",
          format: (log) => ({
            type: "TestamentRejected",
            _depositor: log.args._depositor,
            cid: log.args._cid,
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber.toString(),
          }),
        },
        {
          type: "TestamentOutdated",
          address: testamentManagerAddress,
          abi: "event TestamentOutdated(address indexed _depositor, string _cid)",
          format: (log) => ({
            type: "TestamentOutdated",
            _depositor: log.args._depositor,
            cid: log.args._cid,
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber.toString(),
          }),
        },
      ];

      const logsResults = await Promise.allSettled(
        eventsToWatch.map((event) =>
          publicClient
            .getLogs({
              address: event.address,
              event: parseAbiItem(event.abi),
              fromBlock,
              toBlock: "latest",
            })
            .then((logs) => logs.map(event.format))
        )
      );

      const newEvents = logsResults
        .filter((res) => res.status === "fulfilled")
        .flatMap((res) => res.value);

        if (newEvents.length > 0) {
          const maxBlock = Math.max(...newEvents.map((e) => Number(e.blockNumber)));
          lastBlockRef.current = maxBlock;
  
          const updatedEvents = [
            ...events,
            ...newEvents.filter((e) => !events.some((p) => p.transactionHash === e.transactionHash)),
          ].sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber));
  
          setEvents(updatedEvents);
  

          if (
            newEvents.some(
              (e) => e.type === "TestamentMinted" && e.to === address
            )
          ) {
            mintedRefetchRef.current?.(); // 💥 Refetch depuis le composant LastMintedTestament
          }
        }
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
          {/* METRICS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {metrics.map((metric, index) => (
              <Card
                key={index}
                className="bg-white shadow-sm border border-gray-200 hover:shadow-md transition-all"
              >
                <CardContent className="p-4 flex flex-col items-center text-center space-y-2">
                  <span className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                    {metric.label}
                  </span>
                  {metric.icon}
                  <span className="text-xl font-light text-gray-700">{metric.value}</span>
                </CardContent>
              </Card>
            ))}
          </div>
  
          {/* MAIN GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px] flex-1 overflow-hidden">
            
          <div className="lg:col-span-5 flex flex-col gap-4 h-[800px]">
            {/* Carte 1 - Testament minté */}
            <Card>
              <CardContent className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                  Dernier testament minté
                </h3>
                <LastMintedTestament setRefetchFn={(fn) => (mintedRefetchRef.current = fn)} />
              </CardContent>
            </Card>

            {/* Carte 2 - Testament déposé */}
            <Card>
              <CardContent className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                  Dernier testament déposé
                </h3>
                <LastTestament testamentInfo={localTestamentInfo} />
              </CardContent>
            </Card>

            {/* Carte 3 - Répartition (prend le reste de la hauteur) */}
            <Card className="flex-1 flex flex-col">
              <CardContent className="space-y-4 flex-1 flex flex-col">
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                  Répartition des testaments
                </h3>
                <ResponsivePieChart events={events} address={address} />
              </CardContent>
            </Card>
          </div>
  
            {/* COLONNE DROITE : Historique des événements */}
            <div className="lg:col-span-7 flex flex-col h-[800px]">
              <Card className="flex-1 flex flex-col overflow-hidden">
                <CardContent className="flex flex-col space-y-4 overflow-hidden h-full">
                  <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 flex items-center gap-2">
                    <ScrollText className="w-5 h-5 text-blue-600" />
                    Historique des événements
                  </h3>
                  <div
                    className="overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 rounded-md"
                    style={{ flexGrow: 1 }}
                  >
                    <EventLogList events={events} />
                  </div>
                </CardContent>
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