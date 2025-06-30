const { ethers } = require("hardhat");
const proof = require("../../proof.json"); 

async function main() {
    const verifierAddress = "0x4408AA1A6B20Aa4cD233c1d123550Dc57959E132"; // Your deployed contract

    // Get the contract instance
    const Verifier = await ethers.getContractFactory("Verifier");
    const verifier = await Verifier.attach(verifierAddress);

    // Extract proof elements from proof.json
    const { proof: { a, b, c }, inputs } = proof;

    // Convert proof into Solidity expected format
    const formattedProof = {
        a: [BigInt(a[0]), BigInt(a[1])],
        b: [
            [BigInt(b[0][0]), BigInt(b[0][1])],
            [BigInt(b[1][0]), BigInt(b[1][1])]
        ],
        c: [BigInt(c[0]), BigInt(c[1])]
    };

    // Ensure inputs array is formatted as uint[3]
    const formattedInputs = [
        BigInt(inputs[0]), 
        BigInt(inputs[1]), 
        BigInt(inputs[2])
    ];

    // Call the verification function
    const isValid = await verifier.verifyTx(formattedProof, formattedInputs);

    console.log("Proof verification result:", isValid);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
      console.error(error);
      process.exit(1);
  });
