require("@nomiclabs/hardhat-ethers");
require("dotenv").config();

module.exports = {
  solidity: "0.8.4",
  networks: {
    polygon_mumbai: {
      url: process.env.ALCHEMY_API_URL, // Use an Alchemy API for Polygon Mumbai
      accounts: [process.env.PRIVATE_KEY], // Use your MetaMask private key
    },
  },
};
