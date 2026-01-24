#!/bin/bash
# ============================================================================
# LumenPay Soroban Contract Deployment Script
# ============================================================================
#
# This script builds and deploys the escrow contract to Stellar Testnet.
#
# Prerequisites:
# - Rust with wasm32 target: rustup target add wasm32-unknown-unknown
# - Soroban CLI: cargo install soroban-cli
# - Stellar testnet account with funds
#
# Usage:
#   ./deploy-contracts.sh
#
# ============================================================================

set -e

echo "🚀 LumenPay Soroban Contract Deployment"
echo "========================================"
echo ""

# Configuration
NETWORK="testnet"
CONTRACT_DIR="contracts"
BUILD_DIR="target/wasm32-unknown-unknown/release"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
check_prerequisites() {
    echo "📋 Checking prerequisites..."
    
    if ! command -v soroban &> /dev/null; then
        echo -e "${RED}❌ Soroban CLI not found${NC}"
        echo "Install with: cargo install soroban-cli"
        exit 1
    fi
    
    if ! command -v cargo &> /dev/null; then
        echo -e "${RED}❌ Cargo not found${NC}"
        echo "Install Rust from https://rustup.rs/"
        exit 1
    fi
    
    if ! rustup target list --installed | grep -q "wasm32-unknown-unknown"; then
        echo -e "${YELLOW}⚠️ Adding wasm32 target...${NC}"
        rustup target add wasm32-unknown-unknown
    fi
    
    echo -e "${GREEN}✅ Prerequisites OK${NC}"
    echo ""
}

# Build contracts
build_contracts() {
    echo "🔨 Building contracts..."
    cd "$CONTRACT_DIR"
    
    cargo build --target wasm32-unknown-unknown --release
    
    echo -e "${GREEN}✅ Build complete${NC}"
    cd ..
    echo ""
}

# Generate identity if needed
setup_identity() {
    echo "🔑 Setting up deployer identity..."
    
    if ! soroban keys list | grep -q "lumenpay-deployer"; then
        echo "Creating new deployer identity..."
        soroban keys generate lumenpay-deployer --network $NETWORK
        
        echo "Funding deployer account..."
        DEPLOYER_ADDRESS=$(soroban keys address lumenpay-deployer)
        echo "Deployer address: $DEPLOYER_ADDRESS"
        
        # Request testnet funds
        curl -s "https://friendbot.stellar.org/?addr=$DEPLOYER_ADDRESS" > /dev/null
        echo -e "${GREEN}✅ Deployer account funded${NC}"
    else
        DEPLOYER_ADDRESS=$(soroban keys address lumenpay-deployer)
        echo "Using existing deployer: $DEPLOYER_ADDRESS"
    fi
    
    echo ""
}

# Deploy escrow contract
deploy_escrow() {
    echo "📦 Deploying Escrow Contract..."
    
    WASM_PATH="$CONTRACT_DIR/$BUILD_DIR/escrow.wasm"
    
    if [ ! -f "$WASM_PATH" ]; then
        echo -e "${RED}❌ Contract WASM not found at $WASM_PATH${NC}"
        exit 1
    fi
    
    # Deploy the contract
    CONTRACT_ID=$(soroban contract deploy \
        --wasm "$WASM_PATH" \
        --source lumenpay-deployer \
        --network $NETWORK)
    
    echo -e "${GREEN}✅ Escrow contract deployed!${NC}"
    echo "   Contract ID: $CONTRACT_ID"
    echo ""
    
    # Initialize the contract
    echo "🔧 Initializing contract..."
    soroban contract invoke \
        --id "$CONTRACT_ID" \
        --source lumenpay-deployer \
        --network $NETWORK \
        -- \
        initialize \
        --admin "$DEPLOYER_ADDRESS"
    
    echo -e "${GREEN}✅ Contract initialized${NC}"
    echo ""
    
    # Save to .env
    echo "💾 Saving contract ID to .env..."
    
    if grep -q "ESCROW_CONTRACT_ID" .env 2>/dev/null; then
        # Update existing value
        sed -i "s/ESCROW_CONTRACT_ID=.*/ESCROW_CONTRACT_ID=$CONTRACT_ID/" .env
    else
        # Add new value
        echo "" >> .env
        echo "# Soroban Contracts" >> .env
        echo "ESCROW_CONTRACT_ID=$CONTRACT_ID" >> .env
    fi
    
    echo -e "${GREEN}✅ Contract ID saved to .env${NC}"
    echo ""
}

# Main execution
main() {
    echo ""
    check_prerequisites
    build_contracts
    setup_identity
    deploy_escrow
    
    echo "========================================"
    echo -e "${GREEN}🎉 Deployment Complete!${NC}"
    echo ""
    echo "Contract Details:"
    echo "  Network: Stellar Testnet"
    echo "  Contract ID: $CONTRACT_ID"
    echo "  Admin: $DEPLOYER_ADDRESS"
    echo ""
    echo "View on Stellar Expert:"
    echo "  https://stellar.expert/explorer/testnet/contract/$CONTRACT_ID"
    echo ""
}

main "$@"
