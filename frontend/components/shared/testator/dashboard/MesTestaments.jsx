"use client";
import Head from "next/head";
import { useEffect, useRef, useState } from "react";
import { useAccount, useReadContract, useWaitForTransactionReceipt } from "wagmi";
import DepositTestamentForm from "../sub_components/DepositTestamentForm";
import DecryptionSection from "../sub_components/DecryptionSection";
import EventLogList from "@/components/shared/Events";
import TestamentStatusTable from "@/components/shared/testator/sub_components/TestamentStatusTable";
import SwapModalWrapper from "@/components/shared/SwapModalWraper";
import { DollarSign } from "lucide-react";
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
import { parseAbiItem, formatUnits } from "viem";

export default function MesTestaments() {
  const { address, isConnected } = useAccount();
  const [showSwap, setShowSwap] = useState(false);
  const [events, setEvents] = useState([]);
  const [localTestamentInfo, setLocalTestamentInfo] = useState(null);
  const [inhxBalance, setInhxBalance] = useState(null);
  const [musdtBalance, setMusdtBalance] = useState(null);
  const [depositFeeState, setDepositFeeState] = useState(0);
  const [depositTxHash, setDepositTxHash] = useState(null);

  const lastBlockRef = useRef(22123608);

  const { data: depositFee } = useReadContract({
    address: testamentManagerAddress,
    abi: testamentManagerABI,
    functionName: "baseDepositFee",
    account: address,
  });

  useEffect(() => {
    if (depositFee !== 0) {
      setDepositFeeState(depositFee);
    }
  }, [depositFee]);

  const { refetch: refetchINHXBalance } = useReadContract({
    address: inhxAddress,
    abi: inhxABI,
    functionName: "balanceOf",
    args: [address],
    watch: true,
    account: address,
  });

  const { refetch: refetchMUSDTBalance } = useReadContract({
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

  const { refetch: refetchTestamentCount } = useReadContract({
    address: testamentManagerAddress,
    abi: testamentManagerABI,
    functionName: "getTestamentsNumber",
    args: [address],
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
          format: async (log) => {
            const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
            return {
              type: "TestamentDeposited",
              _depositor: log.args._depositor,
              cid: log.args._cid,
              transactionHash: log.transactionHash,
              blockNumber: log.blockNumber.toString(),
              timestamp: Number(block.timestamp),
            };
          },
        },
        {
          type: "SwapToken",
          address: poolAddress,
          abi: "event TokenSwapped(string _tokenSent, string _tokenReceived, uint256 _balanceBeforeTokenReceived, uint256 _balanceAfterTokenReceived)",
          format: async (log) => {
            const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
            return {
              type: "SwapToken",
              _tokenSent: log.args._tokenSent,
              _tokenReceived: log.args._tokenReceived,
              _balanceBeforeTokenReceived: log.args._balanceBeforeTokenReceived,
              _balanceAfterTokenReceived: log.args._balanceAfterTokenReceived,
              transactionHash: log.transactionHash,
              blockNumber: log.blockNumber.toString(),
              timestamp: Number(block.timestamp),
            };
          },
        },
        {
          type: "TestamentApproved",
          address: testamentManagerAddress,
          abi: "event TestamentApproved(address indexed _depositor, string _cid)",
          format: async (log) => {
            const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
            return {
              type: "TestamentApproved",
              _depositor: log.args._depositor,
              cid: log.args._cid,
              transactionHash: log.transactionHash,
              blockNumber: log.blockNumber.toString(),
              timestamp: Number(block.timestamp),
            };
          },
        },
        {
          type: "TestamentRejected",
          address: testamentManagerAddress,
          abi: "event TestamentRejected(address indexed _depositor, string _cid)",
          format: async (log) => {
            const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
            return {
              type: "TestamentRejected",
              _depositor: log.args._depositor,
              cid: log.args._cid,
              transactionHash: log.transactionHash,
              blockNumber: log.blockNumber.toString(),
              timestamp: Number(block.timestamp),
            };
          },
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
          type: "TestamentOutdated",
          address: testamentManagerAddress,
          abi: "event TestamentOutdated(address indexed _depositor, string _cid)",
          format: async (log) => {
            const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
            return {
              type: "TestamentOutdated",
              _depositor: log.args._depositor,
              cid: log.args._cid,
              transactionHash: log.transactionHash,
              blockNumber: log.blockNumber.toString(),
              timestamp: Number(block.timestamp),
            };
          },
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
            .then(async (logs) => await Promise.all(logs.map(event.format)))
        )
      );
  
      const newEvents = logsResults
        .filter((res) => res.status === "fulfilled")
        .flatMap((res) => res.value);
  
      if (newEvents.length > 0) {
        const maxBlock = Math.max(...newEvents.map((e) => Number(e.blockNumber)));
        lastBlockRef.current = maxBlock;
  
        setEvents((prev) =>
          [...prev, ...newEvents.filter((e) => !prev.some((p) => p.transactionHash === e.transactionHash))].sort(
            (a, b) => Number(b.blockNumber) - Number(a.blockNumber)
          )
        );
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des événements :", error);
    }
  };
  
  const handleSwapSuccess = async () => {
    getEvents();
    const inhx = await refetchINHXBalance();
    const musdt = await refetchMUSDTBalance();
    setInhxBalance(inhx.data);
    setMusdtBalance(musdt.data);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.__onSwapSuccessFromDashboard = handleSwapSuccess;
    }
  }, []);

  const handleDepositSuccess = async (txHash) => {
    if (!txHash) return;  
    await getEvents();
    const inhx = await refetchINHXBalance();
    const musdt = await refetchMUSDTBalance();
    setInhxBalance(inhx.data);
    setMusdtBalance(musdt.data);
  };

  useEffect(() => {
    if (!address) return;

    const fetchInitialData = async () => {
      getEvents();
      const { data: fetchedTestamentInfo } = await refetchTestamentInfo();
      setLocalTestamentInfo(fetchedTestamentInfo);
      const inhx = await refetchINHXBalance();
      const musdt = await refetchMUSDTBalance();
      setInhxBalance(inhx.data);
      setMusdtBalance(musdt.data);
      refetchTestamentCount();
    };

    fetchInitialData();
  }, [address]);

  return (
    <>
      <Head>
        <title>{address ? `${address.slice(0, 6)}...${address.slice(-4)} - Mes Testaments` : "Mes Testaments"}</title>
        <meta name="description" content="Consultez et gérez vos testaments blockchain" />
      </Head>

      <div className="flex min-h-screen bg-gray-50">
        <div className="flex-1">
          <main className="p-4 space-y-8">
            <div className="grid gap-6" style={{ gridTemplateColumns: "0.75fr 1.5fr 1.5fr" }}>
              <section className="bg-white rounded-2xl shadow p-4 flex flex-col items-center justify-center text-center">
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 w-full">Coût du dépôt</h3>
                <div className="flex items-center justify-center mt-2 space-x-2">
                  <DollarSign className="w-6 h-6 text-gray-600" />
                  <span className="text-xl font-light text-gray-900">
                    {depositFee ? formatUnits(depositFee, 18) : '0'} INHX
                  </span>
                </div>
              </section>
              <section className="bg-white rounded-2xl shadow p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Déposer un testament</h3>
                <DepositTestamentForm
                  address={address}
                  isConnected={isConnected}
                  onDepositSuccess={handleDepositSuccess}
                  depositFee={depositFeeState}
                />
              </section>
              <section className="bg-white rounded-2xl shadow p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Déchiffrer un testament</h3>
                <DecryptionSection />
              </section>
            </div>
            <section className="bg-white rounded-2xl shadow p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Mes testaments déposés</h3>
              <TestamentStatusTable events={events} address={address} />
            </section>
            <section className="bg-white rounded-2xl shadow p-6 space-y-4 h-[600px] flex flex-col overflow-hidden">
              <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Historique des événements</h3>
              <div
                className="overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 rounded-md"
                style={{ flexGrow: 1 }}
              >
                <EventLogList events={events} />
              </div>
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