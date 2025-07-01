#!/bin/bash

# ZoKrates Docker Setup Script for Pramaan

echo "🚀 Setting up ZoKrates for Pramaan..."

# Check if Docker is installed
if ! command -v docker &> /dev/null
then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker daemon is running
if ! docker info &> /dev/null
then
    echo "❌ Docker daemon is not running. Please start Docker."
    exit 1
fi

echo "✅ Docker is installed and running"

# Pull ZoKrates Docker image
echo "📥 Pulling ZoKrates Docker image..."
docker pull zokrates/zokrates:latest

if [ $? -eq 0 ]; then
    echo "✅ ZoKrates Docker image pulled successfully"
else
    echo "❌ Failed to pull ZoKrates image"
    exit 1
fi

# Create workspace directory
WORKSPACE_DIR="./zokrates-workspace"
if [ ! -d "$WORKSPACE_DIR" ]; then
    mkdir -p "$WORKSPACE_DIR"
    echo "✅ Created ZoKrates workspace directory"
fi

# Copy the biometric authentication circuit
echo "📄 Setting up biometric authentication circuit..."
cat > "$WORKSPACE_DIR/biometric_authentication.zok" << 'EOF'
// Pramaan: Biometric-based ZKP Authentication
def main(private field hashed_biometric_1, private field hashed_biometric_2, field stored_did_1, field stored_did_2) -> bool {
    // Compare precomputed hash with stored DID
    assert(hashed_biometric_1 == stored_did_1);
    assert(hashed_biometric_2 == stored_did_2);
    
    // If both parts match, authentication is successful
    return true;
}
EOF

echo "✅ Circuit file created"

# Test ZoKrates installation
echo "🧪 Testing ZoKrates installation..."
docker run --rm zokrates/zokrates:latest --version

if [ $? -eq 0 ]; then
    echo "✅ ZoKrates is ready to use!"
else
    echo "❌ ZoKrates test failed"
    exit 1
fi

# Create helper scripts
echo "📝 Creating helper scripts..."

# Compile script
cat > "$WORKSPACE_DIR/compile.sh" << 'EOF'
#!/bin/bash
docker run --rm -v $(pwd):/home/zokrates/workspace zokrates/zokrates:latest compile -i workspace/biometric_authentication.zok -o workspace/out
EOF

# Setup script
cat > "$WORKSPACE_DIR/setup.sh" << 'EOF'
#!/bin/bash
docker run --rm -v $(pwd):/home/zokrates/workspace zokrates/zokrates:latest setup -i workspace/out -p workspace/proving.key -v workspace/verification.key
EOF

# Export verifier script
cat > "$WORKSPACE_DIR/export-verifier.sh" << 'EOF'
#!/bin/bash
docker run --rm -v $(pwd):/home/zokrates/workspace zokrates/zokrates:latest export-verifier -i workspace/verification.key -o workspace/verifier.sol
EOF

chmod +x "$WORKSPACE_DIR"/*.sh

echo "✅ Helper scripts created"

echo ""
echo "🎉 ZoKrates setup completed successfully!"
echo ""
echo "📁 Workspace created at: $WORKSPACE_DIR"
echo ""
echo "Next steps:"
echo "1. cd $WORKSPACE_DIR"
echo "2. ./compile.sh      # Compile the circuit"
echo "3. ./setup.sh        # Generate proving and verification keys"
echo "4. ./export-verifier.sh  # Export the Solidity verifier"
echo ""
echo "Or run 'npm run setup-zokrates' to automate the process"