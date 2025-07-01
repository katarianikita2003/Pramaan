# ZoKrates Integration for Pramaan

This document explains how to set up and use real Zero-Knowledge Proofs with ZoKrates in the Pramaan authentication system.

## Prerequisites

1. **Docker**: Install Docker Desktop from [https://docs.docker.com/get-docker/](https://docs.docker.com/get-docker/)
2. **Node.js**: Version 14 or higher
3. **Git**: For cloning the repository

## Quick Setup

### 1. Install Docker
First, ensure Docker is installed and running on your system:
```bash
docker --version
```

### 2. Run Automated Setup
From the backend directory (`verifier_deployment/pramaan-backend/`):
```bash
npm run setup-zokrates
```

This will:
- Pull the ZoKrates Docker image
- Create a workspace directory
- Compile the biometric authentication circuit
- Generate proving and verification keys
- Export the Solidity verifier contract

### 3. Verify Installation
Check that all files were created:
```bash
ls zokrates-workspace/
```

You should see:
- `biometric_authentication.zok` - The ZKP circuit
- `out` - Compiled circuit
- `proving.key` - Key for generating proofs
- `verification.key` - Key for verifying proofs
- `verifier.sol` - Solidity contract for on-chain verification

## How It Works

### Circuit Design
The `biometric_authentication.zok` circuit implements:
```zokrates
def main(private field hashed_biometric_1, private field hashed_biometric_2, 
         field stored_did_1, field stored_did_2) -> bool {
    assert(hashed_biometric_1 == stored_did_1);
    assert(hashed_biometric_2 == stored_did_2);
    return true;
}
```

- **Private inputs**: Hashed biometric data (kept secret)
- **Public inputs**: Stored DID parts (visible to verifier)
- **Output**: Boolean indicating authentication success

### Integration Flow

1. **User Registration**:
   - Biometric/ID is hashed using SHA-256
   - Hash is split into two field elements
   - DID is generated and stored

2. **Authentication**:
   - User provides biometric/ID
   - System generates a ZK proof that biometric matches DID
   - Proof is generated without revealing the biometric data

3. **Verification**:
   - Proof is verified using the verification key
   - Can be done off-chain (fast) or on-chain (trustless)

## Manual ZoKrates Commands

### Generate Witness
```bash
cd zokrates-workspace
docker run --rm -v $(pwd):/home/zokrates/workspace zokrates/zokrates:latest \
  compute-witness -i workspace/out \
  -a <biometric_hash_1> <biometric_hash_2> <did_hash_1> <did_hash_2> \
  -o workspace/witness
```

### Generate Proof
```bash
docker run --rm -v $(pwd):/home/zokrates/workspace zokrates/zokrates:latest \
  generate-proof -i workspace/out \
  -j workspace/proof.json \
  -p workspace/proving.key \
  -w workspace/witness
```

### Verify Proof
```bash
docker run --rm -v $(pwd):/home/zokrates/workspace zokrates/zokrates:latest \
  verify -v workspace/verification.key -j workspace/proof.json
```

## API Integration

The backend automatically uses ZoKrates when available:

### `/api/authenticate`
- Generates real ZK proofs if ZoKrates is ready
- Falls back to simulated proofs if not
- Response includes `isRealProof` flag

### `/api/verify`
- Verifies proofs using ZoKrates
- Supports both real and simulated proofs
- Returns verification status

## Troubleshooting

### Docker Issues
- **Docker not found**: Ensure Docker is in your PATH
- **Permission denied**: Run with `sudo` on Linux/Mac
- **Docker daemon not running**: Start Docker Desktop

### ZoKrates Issues
- **Compilation fails**: Check circuit syntax
- **Proof generation fails**: Verify witness inputs are valid field elements
- **Verification fails**: Ensure proof matches the verification key

### Performance
- First run pulls ~500MB Docker image
- Proof generation takes 2-5 seconds
- Verification is nearly instant

## Production Considerations

1. **Key Management**:
   - Store proving/verification keys securely
   - Consider key rotation strategy
   - Never expose proving key publicly

2. **Scalability**:
   - Consider proof generation service
   - Cache verification results
   - Use batch verification

3. **Security**:
   - Audit the circuit design
   - Perform trusted setup ceremony
   - Regular security updates

## Next Steps

1. Deploy verifier contract to blockchain
2. Implement biometric capture (see BIOMETRIC_INTEGRATION.md)
3. Set up production key management
4. Performance optimization

## Resources

- [ZoKrates Documentation](https://zokrates.github.io/)
- [ZK-SNARKs Explained](https://z.cash/technology/zksnarks/)
- [Pramaan Architecture](../README.md)