# LumenPay Refactor - Setup Script (PowerShell)
# This script installs dependencies and prepares the environment

Write-Host "🚀 LumenPay Refactor - Setup Script" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the project root
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Please run this script from the project root" -ForegroundColor Red
    exit 1
}

# Install root dependencies
Write-Host "📦 Installing root dependencies..." -ForegroundColor Yellow
pnpm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install root dependencies" -ForegroundColor Red
    exit 1
}

# Install backend dependencies
Write-Host "📦 Installing backend dependencies..." -ForegroundColor Yellow
Set-Location backend
pnpm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install backend dependencies" -ForegroundColor Red
    exit 1
}
Set-Location ..

# Install mobile dependencies
Write-Host "📦 Installing mobile dependencies..." -ForegroundColor Yellow
Set-Location frontend\mobile
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install mobile dependencies" -ForegroundColor Red
    exit 1
}
Set-Location ..\..

# Create mobile .env if it doesn't exist
if (-not (Test-Path "frontend\mobile\.env")) {
    Write-Host "📝 Creating frontend\mobile\.env..." -ForegroundColor Yellow
    @"
EXPO_PUBLIC_API_URL=http://localhost:3001/api
"@ | Out-File -FilePath "frontend\mobile\.env" -Encoding UTF8
    Write-Host "✅ Created frontend\mobile\.env" -ForegroundColor Green
} else {
    Write-Host "ℹ️  frontend\mobile\.env already exists" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Run database migrations in Supabase SQL Editor:"
Write-Host "   - backend/supabase/migrations/003_indexer_telegram.sql"
Write-Host ""
Write-Host "2. Deploy escrow contract (if not already deployed):"
Write-Host "   - cd backend\scripts"
Write-Host "   - ts-node deploy-testnet.ts"
Write-Host "   - Copy contract ID to .env (ESCROW_CONTRACT_ID)"
Write-Host ""
Write-Host "3. Start backend:"
Write-Host "   - cd backend"
Write-Host "   - pnpm dev"
Write-Host ""
Write-Host "4. Start indexer (in separate terminal):"
Write-Host "   - cd backend"
Write-Host "   - pnpm indexer"
Write-Host ""
Write-Host "5. Start mobile app:"
Write-Host "   - cd frontend\mobile"
Write-Host "   - npx expo start"
Write-Host ""
Write-Host "📚 See REFACTORED_SETUP.md for detailed instructions" -ForegroundColor Cyan
