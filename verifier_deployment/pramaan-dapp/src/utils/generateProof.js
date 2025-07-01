import { BrowserProvider, Contract, toBigInt } from "ethers";
import verifierABI from "../contract/Verifier.json";

// Ensure contract address is correctly set
const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS || "0xYourDeployedContractAddress";

// ✅ Generate Proof Function
export const generateProof = async (userId) => {
    // This function should ideally integrate with ZoKrates
    // For now, it's a mock proof
    return {
        proof: {
            a: ["0x1", "0x2"],
            b: [["0x3", "0x4"], ["0x5", "0x6"]],
            c: ["0x7", "0x8"]
        },
        inputs: [userId]
    };
};

// ✅ Verify Proof on Blockchain
export const verifyProofOnChain = async (proof) => {
    if (!window.ethereum) {
        alert("MetaMask is required!");
        return false;
    }

    await window.ethereum.request({ method: "eth_requestAccounts" });

    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === "0xYourDeployedContractAddress") {
        alert("⚠️ Contract address is missing! Set REACT_APP_CONTRACT_ADDRESS in .env.");
        return false;
    }

    const contract = new Contract(CONTRACT_ADDRESS, verifierABI, signer);

    const { proof: { a, b, c }, inputs } = proof;
    const formattedProof = {
        a: [toBigInt(a[0]), toBigInt(a[1])],
        b: [
            [toBigInt(b[0][0]), toBigInt(b[0][1])],
            [toBigInt(b[1][0]), toBigInt(b[1][1])]
        ],
        c: [toBigInt(c[0]), toBigInt(c[1])]
    };
    const formattedInputs = inputs.map((i) => toBigInt(i));

    return await contract.verifyTx(formattedProof, formattedInputs);
};
