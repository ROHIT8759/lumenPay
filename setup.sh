#!/bin/bash

# LumenPay Refactor - Setup Script
# This script installs dependencies and prepares the environment

echo "🚀 LumenPay Refactor - Setup Script"
echo "===================================="

# Check if we're in the project root
if [ ! -f "package.json" ]; then
  echo "❌ Error: Please run this script from the project root"
  exit 1
fi

# Install root dependencies
echo "📦 Installing root dependencies..."
pnpm install || { echo "❌ Failed to install root dependencies"; exit 1; }

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
pnpm install || { echo "❌ Failed to install backend dependencies"; exit 1; }
cd ..

# Install mobile dependencies  
echo "📦 Installing mobile dependencies..."
cd frontend/mobile
npm install || { echo "❌ Failed to install mobile dependencies"; exit 1; }
cd ../..

# Create mobile .env if it doesn't exist
if [ ! -f "frontend/mobile/.env" ]; then
  echo "📝 Creating frontend/mobile/.env..."
  cat > frontend/mobile/.env << EOL
EXPO_PUBLIC_API_URL=http://localhost:3001/api
EOL
  echo "✅ Created frontend/mobile/.env"
else
  echo "ℹ️  frontend/mobile/.env already exists"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Run database migrations in Supabase SQL Editor:"
echo "   - backend/supabase/migrations/003_indexer_telegram.sql"
echo ""
echo "2. Deploy escrow contract (if not already deployed):"
echo "   - cd backend/scripts"
echo "   - ts-node deploy-testnet.ts"
echo "   - Copy contract ID to .env (ESCROW_CONTRACT_ID)"
echo ""
echo "3. Start backend:"
echo "   - cd backend"
echo "   - pnpm dev"
echo ""
echo "4. Start indexer (in separate terminal):"
echo "   - cd backend"
echo "   - pnpm indexer"
echo ""
echo "5. Start mobile app:"
echo "   - cd frontend/mobile"
echo "   - npx expo start"
echo ""
echo "📚 See REFACTORED_SETUP.md for detailed instructions"
