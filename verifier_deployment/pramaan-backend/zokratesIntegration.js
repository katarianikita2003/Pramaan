// zokratesIntegration.js - Fixed for Windows paths with spaces
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import os from 'os';

const execAsync = promisify(exec);

class ZoKratesIntegration {
    constructor() {
        this.workDir = path.join(process.cwd(), 'zokrates-workspace');
        this.circuitPath = path.join(this.workDir, 'biometric_authentication.zok');
        this.dockerImage = 'zokrates/zokrates:latest';
        this.isWindows = os.platform() === 'win32';
    }

    // Initialize workspace
    async initWorkspace() {
        try {
            await fs.mkdir(this.workDir, { recursive: true });
            
            // Copy the ZoK file to workspace
            const zokContent = `// Pramaan: Biometric-based ZKP Authentication
def main(private field hashed_biometric_1, private field hashed_biometric_2, field stored_did_1, field stored_did_2) -> bool {
    // Compare precomputed hash with stored DID
    assert(hashed_biometric_1 == stored_did_1);
    assert(hashed_biometric_2 == stored_did_2);
    
    // If both parts match, authentication is successful
    return true;
}`;
            
            await fs.writeFile(this.circuitPath, zokContent);
            console.log('✅ ZoKrates workspace initialized');
        } catch (error) {
            console.error('❌ Error initializing workspace:', error);
            throw error;
        }
    }

    // Format path for Docker volume mounting
    formatDockerPath(windowsPath) {
        if (this.isWindows) {
            // Convert Windows path to Docker-compatible format
            // D:\Pramaan - ZKP\... -> /d/Pramaan - ZKP/...
            let dockerPath = windowsPath.replace(/\\/g, '/');
            dockerPath = dockerPath.replace(/^([A-Za-z]):/, (match, drive) => `/${drive.toLowerCase()}`);
            return dockerPath;
        }
        return windowsPath;
    }

    // Run ZoKrates command in Docker
    async runZoKratesCommand(command, args = '') {
        const dockerPath = this.formatDockerPath(this.workDir);
        
        // Build the complete Docker command
        let dockerCmd;
        if (this.isWindows) {
            // For Windows, we need to use the proper format
            dockerCmd = `docker run --rm -v "${dockerPath}:/home/zokrates/workspace" ${this.dockerImage} /home/zokrates/.zokrates/bin/zokrates ${command} ${args}`;
        } else {
            dockerCmd = `docker run --rm -v "${dockerPath}:/home/zokrates/workspace" ${this.dockerImage} /home/zokrates/.zokrates/bin/zokrates ${command} ${args}`;
        }
        
        console.log('🔧 Running command:', command);
        
        try {
            const { stdout, stderr } = await execAsync(dockerCmd, {
                maxBuffer: 1024 * 1024 * 10 // 10MB buffer
            });
            
            if (stderr && !stderr.includes('WARNING')) {
                console.warn('⚠️ Command stderr:', stderr);
            }
            
            return stdout;
        } catch (error) {
            console.error(`❌ Error running ZoKrates command: ${command}`, error);
            throw error;
        }
    }

    // Compile the circuit
    async compileCircuit() {
        console.log('🔄 Compiling ZoKrates circuit...');
        
        try {
            await this.runZoKratesCommand('compile', '-i /home/zokrates/workspace/biometric_authentication.zok -o /home/zokrates/workspace/out');
            
            // Check if compilation outputs exist
            const outPath = path.join(this.workDir, 'out');
            await fs.access(outPath);
            
            console.log('✅ Circuit compiled successfully');
            return true;
        } catch (error) {
            console.error('❌ Circuit compilation failed:', error);
            throw error;
        }
    }

    // Perform trusted setup
    async performSetup() {
        console.log('🔄 Performing trusted setup...');
        
        try {
            await this.runZoKratesCommand('setup', '-i /home/zokrates/workspace/out -p /home/zokrates/workspace/proving.key -v /home/zokrates/workspace/verification.key');
            
            // Verify keys were generated
            await fs.access(path.join(this.workDir, 'proving.key'));
            await fs.access(path.join(this.workDir, 'verification.key'));
            
            console.log('✅ Setup completed, keys generated');
            return true;
        } catch (error) {
            console.error('❌ Setup failed:', error);
            throw error;
        }
    }

    // Generate verifier smart contract
    async exportVerifier() {
        console.log('🔄 Exporting verifier contract...');
        
        try {
            await this.runZoKratesCommand('export-verifier', '-i /home/zokrates/workspace/verification.key -o /home/zokrates/workspace/verifier.sol');
            
            const verifierPath = path.join(this.workDir, 'verifier.sol');
            const verifierContract = await fs.readFile(verifierPath, 'utf8');
            
            console.log('✅ Verifier contract exported');
            return verifierContract;
        } catch (error) {
            console.error('❌ Verifier export failed:', error);
            throw error;
        }
    }

    // Hash biometric data
    hashBiometric(biometricData) {
        // Convert biometric data to field elements
        const hash = crypto.createHash('sha256').update(biometricData).digest('hex');
        
        // Split hash into two field elements for ZoKrates
        const part1 = BigInt('0x' + hash.substring(0, 32));
        const part2 = BigInt('0x' + hash.substring(32, 64));
        
        // Ensure values are within field range
        const fieldPrime = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
        
        return {
            part1: (part1 % fieldPrime).toString(),
            part2: (part2 % fieldPrime).toString()
        };
    }

    // Generate witness
    async generateWitness(biometricData, storedDID) {
        console.log('🔄 Generating witness...');
        
        try {
            const hashedBiometric = this.hashBiometric(biometricData);
            const didParts = this.hashBiometric(storedDID);
            
            // Compute witness with arguments
            const args = `${hashedBiometric.part1} ${hashedBiometric.part2} ${didParts.part1} ${didParts.part2}`;
            await this.runZoKratesCommand('compute-witness', `-i /home/zokrates/workspace/out -a ${args} -o /home/zokrates/workspace/witness`);
            
            console.log('✅ Witness generated');
            return true;
        } catch (error) {
            console.error('❌ Witness generation failed:', error);
            throw error;
        }
    }

    // Generate proof
    async generateProof() {
        console.log('🔄 Generating proof...');
        
        try {
            await this.runZoKratesCommand('generate-proof', '-i /home/zokrates/workspace/out -j /home/zokrates/workspace/proof.json -p /home/zokrates/workspace/proving.key -w /home/zokrates/workspace/witness');
            
            // Read the generated proof
            const proofPath = path.join(this.workDir, 'proof.json');
            const proofData = await fs.readFile(proofPath, 'utf8');
            const proof = JSON.parse(proofData);
            
            console.log('✅ Proof generated');
            return proof;
        } catch (error) {
            console.error('❌ Proof generation failed:', error);
            throw error;
        }
    }

    // Verify proof off-chain
    async verifyProof(proof) {
        console.log('🔄 Verifying proof...');
        
        try {
            // Save proof to file
            const proofPath = path.join(this.workDir, 'proof_to_verify.json');
            await fs.writeFile(proofPath, JSON.stringify(proof));
            
            // Run verification
            const result = await this.runZoKratesCommand('verify', '-v /home/zokrates/workspace/verification.key -j /home/zokrates/workspace/proof_to_verify.json');
            
            const isValid = result.includes('PASSED') || result.includes('true');
            console.log(isValid ? '✅ Proof verified successfully' : '❌ Proof verification failed');
            
            return isValid;
        } catch (error) {
            console.error('❌ Proof verification error:', error);
            return false;
        }
    }

    // Test Docker connection
    async testDocker() {
        try {
            console.log('🐳 Testing Docker connection...');
            const { stdout } = await execAsync('docker --version');
            console.log('✅ Docker version:', stdout.trim());
            
            // Test ZoKrates image
            console.log('🔍 Checking ZoKrates image...');
            const dockerPath = this.formatDockerPath(this.workDir);
            const testCmd = `docker run --rm ${this.dockerImage} /home/zokrates/.zokrates/bin/zokrates --version`;
            
            const { stdout: zkVersion } = await execAsync(testCmd);
            console.log('✅ ZoKrates version:', zkVersion.trim());
            
            return true;
        } catch (error) {
            console.error('❌ Docker test failed:', error.message);
            return false;
        }
    }

    // Full setup process
    async setupZoKrates() {
        try {
            // Test Docker first
            const dockerOk = await this.testDocker();
            if (!dockerOk) {
                throw new Error('Docker is not properly configured');
            }

            await this.initWorkspace();
            await this.compileCircuit();
            await this.performSetup();
            const verifierContract = await this.exportVerifier();
            
            return {
                success: true,
                verifierContract,
                message: 'ZoKrates setup completed successfully'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'ZoKrates setup failed'
            };
        }
    }

    // Generate keys (for compatibility with existing code)
    async generateKeys() {
        // Keys are generated during setup phase
        // Return paths to the keys
        return {
            provingKey: path.join(this.workDir, 'proving.key'),
            verificationKey: path.join(this.workDir, 'verification.key')
        };
    }

    // Generate proof with biometric data
    async generateBiometricProof(biometricData, userDID) {
        try {
            await this.generateWitness(biometricData, userDID);
            const proof = await this.generateProof();
            
            return {
                success: true,
                proof
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

export default new ZoKratesIntegration();