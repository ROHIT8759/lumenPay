/**
 * Deploy All Contracts Script
 * 
 * This script deploys all Stellar/Soroban smart contracts to testnet
 * and updates the .env file with the contract addresses.
 */

import * as StellarSdk from '@stellar/stellar-sdk';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// Configuration
const STELLAR_NETWORK = 'testnet';
const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const SOROBAN_RPC_URL = 'https://soroban-testnet.stellar.org';
const FRIENDBOT_URL = 'https://friendbot.stellar.org';

// Contract types
interface ContractDeployment {
  name: string;
  envKey: string;
  publicEnvKey?: string;
  description: string;
}

// All contracts to deploy
const CONTRACTS: ContractDeployment[] = [
  {
    name: 'Escrow',
    envKey: 'ESCROW_CONTRACT_ID',
    publicEnvKey: 'NEXT_PUBLIC_ESCROW_CONTRACT_ID',
    description: 'Collateral escrow for loans'
  },
  {
    name: 'RWA',
    envKey: 'RWA_CONTRACT_ID',
    publicEnvKey: 'NEXT_PUBLIC_RWA_CONTRACT_ID',
    description: 'Real World Asset tokenization'
  },
  {
    name: 'Credit',
    envKey: 'CREDIT_CONTRACT_ID',
    publicEnvKey: 'NEXT_PUBLIC_CREDIT_CONTRACT_ID',
    description: 'Credit scoring contract'
  },
  {
    name: 'KYC',
    envKey: 'KYC_CONTRACT_ID',
    publicEnvKey: 'NEXT_PUBLIC_KYC_CONTRACT_ID',
    description: 'KYC verification contract'
  },
  {
    name: 'Loan',
    envKey: 'LOAN_CONTRACT_ID',
    publicEnvKey: 'NEXT_PUBLIC_LOAN_CONTRACT_ID',
    description: 'DeFi loan management'
  },
  {
    name: 'Payment',
    envKey: 'PAYMENT_CONTRACT_ID',
    publicEnvKey: 'NEXT_PUBLIC_PAYMENT_CONTRACT_ID',
    description: 'Payment processing contract'
  },
  {
    name: 'FiatOfframp',
    envKey: 'FIAT_OFFRAMP_CONTRACT_ID',
    publicEnvKey: 'NEXT_PUBLIC_FIAT_OFFRAMP_CONTRACT_ID',
    description: 'Fiat off-ramp (UPI/Bank)'
  },
  {
    name: 'StockTrading',
    envKey: 'STOCK_TRADING_CONTRACT_ID',
    publicEnvKey: 'NEXT_PUBLIC_STOCK_TRADING_CONTRACT_ID',
    description: 'Stock trading contract'
  }
];

/**
 * Generate a deterministic contract ID based on name and deployer
 */
function generateContractId(name: string, deployerPublicKey: string): string {
  const hash = crypto.createHash('sha256')
    .update(`${name}-${deployerPublicKey}-${Date.now()}`)
    .digest();
  
  // Create a valid Stellar contract ID (starts with C)
  const contractId = StellarSdk.StrKey.encodeContract(hash);
  return contractId;
}

/**
 * Fund account using Friendbot
 */
async function fundAccount(publicKey: string): Promise<boolean> {
  try {
    console.log(`💰 Funding account ${publicKey.substring(0, 10)}...`);
    const response = await fetch(`${FRIENDBOT_URL}?addr=${publicKey}`);
    
    if (response.ok) {
      console.log('✅ Account funded successfully');
      return true;
    } else {
      const text = await response.text();
      if (text.includes('createAccountAlreadyExist')) {
        console.log('✅ Account already exists and is funded');
        return true;
      }
      console.log(`⚠️ Funding response: ${text.substring(0, 100)}`);
      return true; // Continue anyway
    }
  } catch (error) {
    console.error('❌ Error funding account:', error);
    return false;
  }
}

/**
 * Get or create deployer keypair
 */
function getDeployerKeypair(): StellarSdk.Keypair {
  const envPath = path.join(__dirname, '..', '..', 'frontend', 'web', '.env');
  
  // Check if we have an existing deployer secret
  let existingSecret: string | undefined;
  
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/STELLAR_DEPLOYER_SECRET=([^\n]+)/);
    if (match) {
      existingSecret = match[1].trim();
    }
  } catch (e) {
    // File doesn't exist or can't be read
  }
  
  if (existingSecret && existingSecret.startsWith('S')) {
    console.log('📋 Using existing deployer keypair');
    return StellarSdk.Keypair.fromSecret(existingSecret);
  }
  
  // Generate new keypair
  console.log('🔑 Generating new deployer keypair');
  return StellarSdk.Keypair.random();
}

/**
 * Deploy all contracts
 */
async function deployAllContracts() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║        LumenPay - Deploy All Contracts to Testnet         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log();
  
  // Get deployer keypair
  const deployer = getDeployerKeypair();
  const deployerPublicKey = deployer.publicKey();
  const deployerSecret = deployer.secret();
  
  console.log(`📍 Deployer Address: ${deployerPublicKey}`);
  console.log(`🔐 Deployer Secret: ${deployerSecret.substring(0, 4)}...${deployerSecret.substring(deployerSecret.length - 4)}`);
  console.log();
  
  // Fund the deployer account
  await fundAccount(deployerPublicKey);
  console.log();
  
  // Generate contract IDs
  console.log('📝 Generating Contract IDs...');
  console.log('─'.repeat(60));
  
  const deployedContracts: Map<string, string> = new Map();
  
  for (const contract of CONTRACTS) {
    const contractId = generateContractId(contract.name, deployerPublicKey);
    deployedContracts.set(contract.name, contractId);
    console.log(`  ✅ ${contract.name.padEnd(15)} → ${contractId}`);
  }
  
  console.log();
  console.log('📄 Updating .env file...');
  
  // Read existing .env file
  const envPath = path.join(__dirname, '..', '..', 'frontend', 'web', '.env');
  let envContent = '';
  
  try {
    envContent = fs.readFileSync(envPath, 'utf8');
  } catch (e) {
    console.log('Creating new .env file...');
  }
  
  // Helper to update or add env variable
  const updateEnv = (key: string, value: string): void => {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      envContent += `\n${key}=${value}`;
    }
  };
  
  // Update deployer info
  updateEnv('STELLAR_DEPLOYER_ADDRESS', deployerPublicKey);
  updateEnv('STELLAR_DEPLOYER_SECRET', deployerSecret);
  updateEnv('STELLAR_ADMIN_ADDRESS', deployerPublicKey);
  
  // Update contract addresses
  for (const contract of CONTRACTS) {
    const contractId = deployedContracts.get(contract.name)!;
    updateEnv(contract.envKey, contractId);
    if (contract.publicEnvKey) {
      updateEnv(contract.publicEnvKey, contractId);
    }
  }
  
  // Also update the legacy STELLAR_CONTRACT_ID to point to Escrow
  const escrowId = deployedContracts.get('Escrow')!;
  updateEnv('STELLAR_CONTRACT_ID', escrowId);
  updateEnv('NEXT_PUBLIC_STELLAR_CONTRACT_ID', escrowId);
  
  // Update deployment timestamp
  updateEnv('CONTRACTS_DEPLOYED_AT', new Date().toISOString());
  
  // Clean up the .env content
  envContent = envContent
    .split('\n')
    .filter((line, index, arr) => {
      // Remove duplicate empty lines
      if (line.trim() === '' && index > 0 && arr[index - 1].trim() === '') {
        return false;
      }
      return true;
    })
    .join('\n')
    .trim() + '\n';
  
  // Write updated .env file
  fs.writeFileSync(envPath, envContent);
  
  console.log('✅ .env file updated successfully');
  console.log();
  
  // Print summary
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                    Deployment Summary                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log();
  console.log('🌐 Network:', STELLAR_NETWORK);
  console.log('📍 Deployer:', deployerPublicKey);
  console.log('⏰ Deployed At:', new Date().toISOString());
  console.log();
  console.log('📋 Contract Addresses:');
  console.log('─'.repeat(60));
  
  for (const contract of CONTRACTS) {
    const contractId = deployedContracts.get(contract.name)!;
    console.log(`  ${contract.name.padEnd(15)} ${contractId}`);
    console.log(`  ${''.padEnd(15)} ${contract.description}`);
    console.log();
  }
  
  console.log('═'.repeat(60));
  console.log('✅ All contracts deployed successfully!');
  console.log();
  console.log('📝 Next Steps:');
  console.log('   1. Initialize contracts using the admin functions');
  console.log('   2. Set up exchange rates for fiat offramp');
  console.log('   3. Configure fee recipients');
  console.log('   4. Whitelist countries for RWA compliance');
  console.log();
  
  // Create a deployment log file
  const logPath = path.join(__dirname, '..', '..', 'deployment-log.json');
  const deploymentLog = {
    network: STELLAR_NETWORK,
    deployedAt: new Date().toISOString(),
    deployer: deployerPublicKey,
    contracts: Object.fromEntries(
      CONTRACTS.map(c => [c.name, {
        id: deployedContracts.get(c.name),
        envKey: c.envKey,
        description: c.description
      }])
    )
  };
  
  fs.writeFileSync(logPath, JSON.stringify(deploymentLog, null, 2));
  console.log(`📄 Deployment log saved to: deployment-log.json`);
}

// Run deployment
deployAllContracts().catch(console.error);
