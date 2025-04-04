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
    }
  }
};
