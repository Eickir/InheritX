require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {version: "0.8.28"}, 
    ]
  }, 
  defaultNetwork: "hardhat", 
  networks: {
    hardhat: {
      forking: {
        url: process.env.MAINNET_RPC_URL,
        enabled: true, 
        blockNumber: 22123608
      }
    }, 
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,
      chainId: 11155111,
      accounts: [`0x${process.env.PRIVATE_KEY}`]
    }
  },
  gasReporter: {
    enabled: true,
  }, 
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  }
};
