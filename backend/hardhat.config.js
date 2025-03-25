require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {version: "0.8.28"}, // Newest contract
      {
        version: "0.4.17", // Pour ton contrat USDT
        settings: {
            optimizer: {
                enabled: true,
                runs: 200
            },
            evmVersion: "byzantium"  // 🔥 Version EVM adaptée à Solidity 0.4.17
        }
    }
    ]
  }, 
  defaultNetwork: "hardhat", 
  networks: {
    hardhat: {
      forking: {
        enabled: true, 
        url: process.env.MAINNET_RPC_URL,
        blockNumber: 22123608
      }
    }
  }
};
