// setupZokrates.js - Fixed for Windows paths with spaces
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execAsync = promisify(exec);
const isWindows = os.platform() === 'win32';

// Format path for Docker on Windows
function formatDockerPath(windowsPath) {
    if (isWindows) {
        // Convert Windows path to Docker-compatible format
        let dockerPath = windowsPath.replace(/\\/g, '/');
        dockerPath = dockerPath.replace(/^([A-Za-z]):/, (match, drive) => `/${drive.toLowerCase()}`);
        return dockerPath;
    }
    return windowsPath;
}

async function setupZokrates() {
    console.log('🚀 Starting ZoKrates setup for Pramaan...\n');
    console.log(`Platform: ${os.platform()}`);
    console.log(`Working directory: ${process.cwd()}\n`);

    try {
        // Step 1: Check Docker
        console.log('Step 1: Checking Docker installation...');
        try {
            const { stdout } = await execAsync('docker --version');
            console.log('✅ Docker is installed:', stdout.trim());
        } catch (error) {
            console.error('❌ Docker is not installed or not in PATH');
            console.error('Please install Docker from: https://docs.docker.com/get-docker/');
            process.exit(1);
        }

        // Step 2: Pull ZoKrates image
        console.log('\nStep 2: Pulling ZoKrates Docker image...');
        console.log('This may take a few minutes on first run...');
        await execAsync('docker pull zokrates/zokrates:latest');
        console.log('✅ ZoKrates image downloaded\n');

        // Step 3: Test ZoKrates
        console.log('Step 3: Testing ZoKrates...');
        try {
            const { stdout } = await execAsync('docker run --rm zokrates/zokrates:latest /home/zokrates/.zokrates/bin/zokrates --version');
            console.log('✅ ZoKrates is working:', stdout.trim());
        } catch (error) {
            console.error('⚠️ ZoKrates test failed, but continuing...');
        }

        // Step 4: Create workspace
        console.log('\nStep 4: Creating workspace...');
        const workspaceDir = path.join(__dirname, '..', 'zokrates-workspace');
        await fs.mkdir(workspaceDir, { recursive: true });
        console.log(`✅ Workspace created at: ${workspaceDir}`);

        // Step 5: Create circuit file
        console.log('\nStep 5: Creating biometric authentication circuit...');
        const circuitContent = `// Pramaan: Biometric-based ZKP Authentication
def main(private field hashed_biometric_1, private field hashed_biometric_2, field stored_did_1, field stored_did_2) -> bool {
    // Compare precomputed hash with stored DID
    assert(hashed_biometric_1 == stored_did_1);
    assert(hashed_biometric_2 == stored_did_2);
    
    // If both parts match, authentication is successful
    return true;
}`;

        await fs.writeFile(
            path.join(workspaceDir, 'biometric_authentication.zok'),
            circuitContent
        );
        console.log('✅ Circuit file created');

        // Step 6: Compile circuit
        console.log('\nStep 6: Compiling circuit...');
        const dockerPath = formatDockerPath(workspaceDir);
        console.log(`Docker volume path: ${dockerPath}`);
        
        const compileCmd = `docker run --rm -v "${dockerPath}:/home/zokrates/workspace" zokrates/zokrates:latest /home/zokrates/.zokrates/bin/zokrates compile -i /home/zokrates/workspace/biometric_authentication.zok -o /home/zokrates/workspace/out`;
        
        try {
            await execAsync(compileCmd);
            console.log('✅ Circuit compiled successfully');
        } catch (error) {
            console.error('❌ Compilation failed:', error.message);
            throw error;
        }

        // Step 7: Perform setup
        console.log('\nStep 7: Performing trusted setup...');
        console.log('Generating proving and verification keys...');
        const setupCmd = `docker run --rm -v "${dockerPath}:/home/zokrates/workspace" zokrates/zokrates:latest /home/zokrates/.zokrates/bin/zokrates setup -i /home/zokrates/workspace/out -p /home/zokrates/workspace/proving.key -v /home/zokrates/workspace/verification.key`;
        
        await execAsync(setupCmd);
        console.log('✅ Keys generated');

        // Step 8: Export verifier
        console.log('\nStep 8: Exporting Solidity verifier contract...');
        const exportCmd = `docker run --rm -v "${dockerPath}:/home/zokrates/workspace" zokrates/zokrates:latest /home/zokrates/.zokrates/bin/zokrates export-verifier -i /home/zokrates/workspace/verification.key -o /home/zokrates/workspace/verifier.sol`;
        
        await execAsync(exportCmd);
        console.log('✅ Verifier contract exported');

        // Step 9: Copy verifier to contracts directory
        console.log('\nStep 9: Setting up verifier contract...');
        const contractsDir = path.join(__dirname, '..', 'contracts');
        await fs.mkdir(contractsDir, { recursive: true });
        
        const verifierSource = path.join(workspaceDir, 'verifier.sol');
        const verifierDest = path.join(contractsDir, 'ZokratesVerifier.sol');
        
        await fs.copyFile(verifierSource, verifierDest);
        console.log('✅ Verifier contract copied to contracts directory');

        // Step 10: Create helper scripts
        console.log('\nStep 10: Creating helper scripts...');
        
        // Windows batch file
        if (isWindows) {
            const batchContent = `@echo off
echo Running ZoKrates commands on Windows...
set WORKSPACE=%~dp0
docker run --rm -v "%WORKSPACE%:/home/zokrates/workspace" zokrates/zokrates:latest /home/zokrates/.zokrates/bin/zokrates %*
`;
            await fs.writeFile(
                path.join(workspaceDir, 'zokrates.bat'),
                batchContent
            );
            console.log('✅ Windows batch file created');
        }

        // Create example usage
        const exampleContent = `// Example: How to use ZoKrates with Pramaan

// For Windows users with paths containing spaces:
// 1. Use the zokrates.bat file in the workspace directory
// 2. Or use the Node.js integration which handles paths automatically

// Example commands (run from workspace directory):

// 1. Generate witness (example input)
// Biometric hash parts: 123456789, 987654321
// DID hash parts: 123456789, 987654321
${isWindows ? 'zokrates.bat' : 'docker run --rm -v "$(pwd):/home/zokrates/workspace" zokrates/zokrates:latest /home/zokrates/.zokrates/bin/zokrates'} compute-witness -i /home/zokrates/workspace/out -a 123456789 987654321 123456789 987654321 -o /home/zokrates/workspace/witness

// 2. Generate proof
${isWindows ? 'zokrates.bat' : 'docker run --rm -v "$(pwd):/home/zokrates/workspace" zokrates/zokrates:latest /home/zokrates/.zokrates/bin/zokrates'} generate-proof -i /home/zokrates/workspace/out -j /home/zokrates/workspace/proof.json -p /home/zokrates/workspace/proving.key -w /home/zokrates/workspace/witness

// 3. Verify proof
${isWindows ? 'zokrates.bat' : 'docker run --rm -v "$(pwd):/home/zokrates/workspace" zokrates/zokrates:latest /home/zokrates/.zokrates/bin/zokrates'} verify -v /home/zokrates/workspace/verification.key -j /home/zokrates/workspace/proof.json
`;

        await fs.writeFile(
            path.join(workspaceDir, 'example-usage.txt'),
            exampleContent
        );
        console.log('✅ Example usage file created');

        // Success message
        console.log('\n🎉 ZoKrates setup completed successfully!\n');
        console.log('📁 Files created:');
        console.log(`   - Circuit: ${workspaceDir}/biometric_authentication.zok`);
        console.log(`   - Compiled: ${workspaceDir}/out`);
        console.log(`   - Proving key: ${workspaceDir}/proving.key`);
        console.log(`   - Verification key: ${workspaceDir}/verification.key`);
        console.log(`   - Verifier contract: ${contractsDir}/ZokratesVerifier.sol`);
        
        if (isWindows) {
            console.log(`   - Windows helper: ${workspaceDir}/zokrates.bat`);
        }
        
        console.log('\n✨ Your ZoKrates integration is ready to use!');
        console.log('Run your backend server and the ZKP functions will use real proofs.\n');

    } catch (error) {
        console.error('\n❌ Setup failed:', error.message);
        console.error('\nTroubleshooting for Windows users:');
        console.error('1. Make sure Docker Desktop is running');
        console.error('2. Enable "Expose daemon on tcp://localhost:2375" in Docker settings');
        console.error('3. Try running from a path without spaces');
        console.error('4. Run Docker commands manually from the workspace directory');
        process.exit(1);
    }
}

// Run setup
setupZokrates();