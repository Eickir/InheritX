"use client";
import '@rainbow-me/rainbowkit/styles.css';
import {
  getDefaultConfig,
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import {hardhat} from 'wagmi/chains';
import {
  QueryClientProvider,
  QueryClient,
} from "@tanstack/react-query";
import { sepolia } from '@/utils/sepolia';


const config = getDefaultConfig({
    appName: 'InheritX Dapp',
    projectId: '05a5439a30a2c42f2d89eff73a602733',
    chains: [sepolia, hardhat],
    ssr: true, // If your dApp uses server side rendering (SSR)
  });

  const queryClient = new QueryClient();  

const RainbowKitAndWagmiProvider = ({children}) => {
    return (
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider>
            {children}
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    );
  };

export default RainbowKitAndWagmiProvider;