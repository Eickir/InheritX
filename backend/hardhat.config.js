require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const MAINNET_RPC_URL = process.env.MAINNET_RPC_URL;
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

const networks = {
  hardhat: {
    forking: {
      url: MAINNET_RPC_URL,
      enabled: true,
      blockNumber: 22123608,
    },
  },
};

// Ajoute la configuration sepolia uniquement si les variables sont définies et valides
if (SEPOLIA_RPC_URL && PRIVATE_KEY && PRIVATE_KEY.length === 64) {
  networks.sepolia = {
    url: SEPOLIA_RPC_URL,
    chainId: 11155111,
    accounts: [`0x${PRIVATE_KEY}`],
  };
}

module.exports = {
  solidity: {
    compilers: [{ version: "0.8.28" }],
  },
  defaultNetwork: "hardhat",
  networks,
  gasReporter: {
    enabled: true,
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
};
