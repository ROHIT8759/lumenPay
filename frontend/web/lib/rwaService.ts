/**
 * Real World Asset (RWA) Service
 * 
 * This service provides functionality for managing tokenized real-world assets
 * on the Stellar network using Soroban smart contracts.
 * 
 * Features:
 * - Asset tokenization (real estate, commodities, securities, etc.)
 * - Fractional ownership management
 * - Investor KYC/compliance verification
 * - Dividend/yield distribution
 * - Transfer restrictions for regulated assets
 */

import {
  Contract,
  rpc,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  Keypair,
  scValToNative,
  nativeToScVal,
  Address,
} from '@stellar/stellar-sdk';
import { supabase } from './supabaseClient';

// ============== Configuration ==============

const RWA_CONTRACT_ID = process.env.NEXT_PUBLIC_RWA_CONTRACT_ID || process.env.RWA_CONTRACT_ID;
const SOROBAN_RPC_URL = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = Networks.TESTNET;

const server = new rpc.Server(SOROBAN_RPC_URL);

// ============== Types ==============

export type AssetType = 
  | 'RealEstate'
  | 'Commodity'
  | 'Security'
  | 'Bond'
  | 'Art'
  | 'Collectible'
  | 'Invoice'
  | 'Equipment'
  | 'IntellectualProperty'
  | 'Other';

export interface RWAAsset {
  assetId: string;
  name: string;
  symbol: string;
  assetType: AssetType;
  totalSupply: string;
  circulatingSupply: string;
  issuer: string;
  custodian: string;
  assetValueUsd: string;
  createdAt: Date;
  lastValuation: Date;
  isActive: boolean;
  isTransferable: boolean;
  minInvestment: string;
  accreditedOnly: boolean;
}

export interface Investor {
  address: string;
  isAccredited: boolean;
  isKycVerified: boolean;
  kycExpiry: Date;
  countryCode: string;
  totalInvested: string;
  registeredAt: Date;
}

export interface Holding {
  assetId: string;
  investor: string;
  amount: string;
  purchasePrice: string;
  acquiredAt: Date;
  lockedUntil: Date;
  currentValue?: string;
}

export interface Distribution {
  distributionId: string;
  assetId: string;
  totalAmount: string;
  perTokenAmount: string;
  distributionToken: string;
  snapshotTime: Date;
  createdAt: Date;
  isClaimed: boolean;
}

export interface CreateAssetParams {
  name: string;
  symbol: string;
  assetType: AssetType;
  totalSupply: string;
  assetValueUsd: string;
  custodian: string;
  tokenAddress: string;
  minInvestment: string;
  accreditedOnly: boolean;
}

export interface InvestParams {
  assetId: string;
  amount: string;
  paymentToken: string;
  paymentAmount: string;
}

export interface TransferParams {
  assetId: string;
  to: string;
  amount: string;
}

export interface RWAPortfolio {
  holdings: Holding[];
  totalValueUsd: string;
  unclaimedDividends: string;
  assetCount: number;
}

// ============== Helper Functions ==============

function getRWAContract(): Contract {
  if (!RWA_CONTRACT_ID) {
    throw new Error('RWA Contract ID not configured. Please set RWA_CONTRACT_ID in .env');
  }
  return new Contract(RWA_CONTRACT_ID);
}

function assetTypeToScVal(assetType: AssetType): any {
  const typeMap: Record<AssetType, string> = {
    RealEstate: 'RealEstate',
    Commodity: 'Commodity',
    Security: 'Security',
    Bond: 'Bond',
    Art: 'Art',
    Collectible: 'Collectible',
    Invoice: 'Invoice',
    Equipment: 'Equipment',
    IntellectualProperty: 'IntellectualProperty',
    Other: 'Other',
  };
  return nativeToScVal({ [typeMap[assetType]]: [] }, { type: 'symbol' });
}

async function waitForTransaction(hash: string): Promise<rpc.Api.GetTransactionResponse> {
  let status = await server.getTransaction(hash);
  let attempts = 0;
  const maxAttempts = 30;
  
  while (status.status === 'NOT_FOUND' && attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    status = await server.getTransaction(hash);
    attempts++;
  }
  
  return status;
}

// ============== RWA Service Class ==============

class RWAService {
  private demoMode: boolean;

  constructor() {
    this.demoMode = process.env.RWA_DEMO_MODE === 'true' || process.env.NODE_ENV === 'development';
  }

  // ============== Admin Functions ==============

  /**
   * Initialize the RWA contract (admin only)
   */
  async initialize(adminKeypair: Keypair): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      const contract = getRWAContract();
      const adminAccount = await server.getAccount(adminKeypair.publicKey());

      const transaction = new TransactionBuilder(adminAccount, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          contract.call(
            'initialize',
            nativeToScVal(Address.fromString(adminKeypair.publicKey()))
          )
        )
        .setTimeout(30)
        .build();

      const simulated = await server.simulateTransaction(transaction);

      if (rpc.Api.isSimulationError(simulated)) {
        return { success: false, error: `Simulation failed: ${simulated.error}` };
      }

      const prepared = rpc.assembleTransaction(transaction, simulated).build();
      prepared.sign(adminKeypair);

      const result = await server.sendTransaction(prepared);
      const status = await waitForTransaction(result.hash);

      if (status.status === 'SUCCESS') {
        return { success: true, txHash: result.hash };
      }

      return { success: false, error: `Transaction failed with status: ${status.status}` };
    } catch (error: any) {
      console.error('Failed to initialize RWA contract:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create/tokenize a new real-world asset (admin only)
   */
  async createAsset(
    adminKeypair: Keypair,
    params: CreateAssetParams
  ): Promise<{ success: boolean; assetId?: string; txHash?: string; error?: string }> {
    try {
      // Validate parameters
      if (!params.name || !params.symbol) {
        return { success: false, error: 'Name and symbol are required' };
      }

      if (BigInt(params.totalSupply) <= 0 || BigInt(params.assetValueUsd) <= 0) {
        return { success: false, error: 'Total supply and asset value must be positive' };
      }

      const contract = getRWAContract();
      const adminAccount = await server.getAccount(adminKeypair.publicKey());

      const transaction = new TransactionBuilder(adminAccount, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          contract.call(
            'create_asset',
            nativeToScVal(params.name, { type: 'string' }),
            nativeToScVal(params.symbol, { type: 'string' }),
            assetTypeToScVal(params.assetType),
            nativeToScVal(BigInt(params.totalSupply), { type: 'i128' }),
            nativeToScVal(BigInt(params.assetValueUsd), { type: 'i128' }),
            nativeToScVal(Address.fromString(params.custodian)),
            nativeToScVal(Address.fromString(params.tokenAddress)),
            nativeToScVal(BigInt(params.minInvestment), { type: 'i128' }),
            nativeToScVal(params.accreditedOnly, { type: 'bool' })
          )
        )
        .setTimeout(30)
        .build();

      const simulated = await server.simulateTransaction(transaction);

      if (rpc.Api.isSimulationError(simulated)) {
        return { success: false, error: `Simulation failed: ${simulated.error}` };
      }

      const prepared = rpc.assembleTransaction(transaction, simulated).build();
      prepared.sign(adminKeypair);

      const result = await server.sendTransaction(prepared);
      const status = await waitForTransaction(result.hash);

      if (status.status === 'SUCCESS' && 'returnValue' in status && status.returnValue) {
        const assetId = scValToNative(status.returnValue);
        
        // Store in database
        await this.storeAssetInDb({
          ...params,
          assetId: assetId.toString(),
          issuer: adminKeypair.publicKey(),
        });

        return { success: true, assetId: assetId.toString(), txHash: result.hash };
      }

      return { success: false, error: `Transaction failed with status: ${status.status}` };
    } catch (error: any) {
      console.error('Failed to create RWA asset:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update asset valuation (admin only)
   */
  async updateValuation(
    adminKeypair: Keypair,
    assetId: string,
    newValueUsd: string
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      const contract = getRWAContract();
      const adminAccount = await server.getAccount(adminKeypair.publicKey());

      const transaction = new TransactionBuilder(adminAccount, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          contract.call(
            'update_valuation',
            nativeToScVal(BigInt(assetId), { type: 'u64' }),
            nativeToScVal(BigInt(newValueUsd), { type: 'i128' })
          )
        )
        .setTimeout(30)
        .build();

      const simulated = await server.simulateTransaction(transaction);

      if (rpc.Api.isSimulationError(simulated)) {
        return { success: false, error: `Simulation failed: ${simulated.error}` };
      }

      const prepared = rpc.assembleTransaction(transaction, simulated).build();
      prepared.sign(adminKeypair);

      const result = await server.sendTransaction(prepared);
      const status = await waitForTransaction(result.hash);

      if (status.status === 'SUCCESS') {
        // Update in database
        await supabase
          .from('rwa_assets')
          .update({ 
            asset_value_usd: newValueUsd, 
            last_valuation: new Date().toISOString() 
          })
          .eq('asset_id', assetId);

        return { success: true, txHash: result.hash };
      }

      return { success: false, error: `Transaction failed with status: ${status.status}` };
    } catch (error: any) {
      console.error('Failed to update valuation:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Register an investor with KYC verification (admin only)
   */
  async registerInvestor(
    adminKeypair: Keypair,
    investorAddress: string,
    isAccredited: boolean,
    countryCode: string,
    kycExpiryDays: number = 365
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      const contract = getRWAContract();
      const adminAccount = await server.getAccount(adminKeypair.publicKey());
      
      const kycExpiry = Math.floor(Date.now() / 1000) + (kycExpiryDays * 24 * 60 * 60);

      const transaction = new TransactionBuilder(adminAccount, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          contract.call(
            'register_investor',
            nativeToScVal(Address.fromString(investorAddress)),
            nativeToScVal(isAccredited, { type: 'bool' }),
            nativeToScVal(countryCode, { type: 'string' }),
            nativeToScVal(BigInt(kycExpiry), { type: 'u64' })
          )
        )
        .setTimeout(30)
        .build();

      const simulated = await server.simulateTransaction(transaction);

      if (rpc.Api.isSimulationError(simulated)) {
        return { success: false, error: `Simulation failed: ${simulated.error}` };
      }

      const prepared = rpc.assembleTransaction(transaction, simulated).build();
      prepared.sign(adminKeypair);

      const result = await server.sendTransaction(prepared);
      const status = await waitForTransaction(result.hash);

      if (status.status === 'SUCCESS') {
        // Store in database
        await supabase
          .from('rwa_investors')
          .upsert({
            wallet_address: investorAddress,
            is_accredited: isAccredited,
            is_kyc_verified: true,
            kyc_expiry: new Date(kycExpiry * 1000).toISOString(),
            country_code: countryCode,
            registered_at: new Date().toISOString(),
          });

        return { success: true, txHash: result.hash };
      }

      return { success: false, error: `Transaction failed with status: ${status.status}` };
    } catch (error: any) {
      console.error('Failed to register investor:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Whitelist a country for investment (admin only)
   */
  async whitelistCountry(
    adminKeypair: Keypair,
    countryCode: string,
    allowed: boolean
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      const contract = getRWAContract();
      const adminAccount = await server.getAccount(adminKeypair.publicKey());

      const transaction = new TransactionBuilder(adminAccount, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          contract.call(
            'whitelist_country',
            nativeToScVal(countryCode, { type: 'string' }),
            nativeToScVal(allowed, { type: 'bool' })
          )
        )
        .setTimeout(30)
        .build();

      const simulated = await server.simulateTransaction(transaction);

      if (rpc.Api.isSimulationError(simulated)) {
        return { success: false, error: `Simulation failed: ${simulated.error}` };
      }

      const prepared = rpc.assembleTransaction(transaction, simulated).build();
      prepared.sign(adminKeypair);

      const result = await server.sendTransaction(prepared);
      const status = await waitForTransaction(result.hash);

      if (status.status === 'SUCCESS') {
        return { success: true, txHash: result.hash };
      }

      return { success: false, error: `Transaction failed with status: ${status.status}` };
    } catch (error: any) {
      console.error('Failed to whitelist country:', error);
      return { success: false, error: error.message };
    }
  }

  // ============== Investment Functions ==============

  /**
   * Invest in an RWA asset
   */
  async invest(
    investorKeypair: Keypair,
    params: InvestParams
  ): Promise<{ success: boolean; txHash?: string; holding?: Holding; error?: string }> {
    try {
      // Check eligibility first
      const eligibility = await this.checkEligibility(params.assetId, investorKeypair.publicKey());
      if (!eligibility.eligible) {
        return { success: false, error: eligibility.reason };
      }

      const contract = getRWAContract();
      const investorAccount = await server.getAccount(investorKeypair.publicKey());

      const transaction = new TransactionBuilder(investorAccount, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          contract.call(
            'invest',
            nativeToScVal(BigInt(params.assetId), { type: 'u64' }),
            nativeToScVal(Address.fromString(investorKeypair.publicKey())),
            nativeToScVal(BigInt(params.amount), { type: 'i128' }),
            nativeToScVal(Address.fromString(params.paymentToken)),
            nativeToScVal(BigInt(params.paymentAmount), { type: 'i128' })
          )
        )
        .setTimeout(30)
        .build();

      const simulated = await server.simulateTransaction(transaction);

      if (rpc.Api.isSimulationError(simulated)) {
        return { success: false, error: `Simulation failed: ${simulated.error}` };
      }

      const prepared = rpc.assembleTransaction(transaction, simulated).build();
      prepared.sign(investorKeypair);

      const result = await server.sendTransaction(prepared);
      const status = await waitForTransaction(result.hash);

      if (status.status === 'SUCCESS') {
        // Store in database
        const holding = await this.storeHoldingInDb({
          assetId: params.assetId,
          investor: investorKeypair.publicKey(),
          amount: params.amount,
          purchasePrice: (BigInt(params.paymentAmount) / BigInt(params.amount)).toString(),
        });

        return { success: true, txHash: result.hash, holding };
      }

      return { success: false, error: `Transaction failed with status: ${status.status}` };
    } catch (error: any) {
      console.error('Failed to invest:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Transfer RWA tokens to another investor
   */
  async transfer(
    fromKeypair: Keypair,
    params: TransferParams
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      // Check recipient eligibility
      const eligibility = await this.checkEligibility(params.assetId, params.to);
      if (!eligibility.eligible) {
        return { success: false, error: `Recipient not eligible: ${eligibility.reason}` };
      }

      const contract = getRWAContract();
      const fromAccount = await server.getAccount(fromKeypair.publicKey());

      const transaction = new TransactionBuilder(fromAccount, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          contract.call(
            'transfer',
            nativeToScVal(BigInt(params.assetId), { type: 'u64' }),
            nativeToScVal(Address.fromString(fromKeypair.publicKey())),
            nativeToScVal(Address.fromString(params.to)),
            nativeToScVal(BigInt(params.amount), { type: 'i128' })
          )
        )
        .setTimeout(30)
        .build();

      const simulated = await server.simulateTransaction(transaction);

      if (rpc.Api.isSimulationError(simulated)) {
        return { success: false, error: `Simulation failed: ${simulated.error}` };
      }

      const prepared = rpc.assembleTransaction(transaction, simulated).build();
      prepared.sign(fromKeypair);

      const result = await server.sendTransaction(prepared);
      const status = await waitForTransaction(result.hash);

      if (status.status === 'SUCCESS') {
        // Update holdings in database
        await this.updateHoldingsAfterTransfer(
          params.assetId,
          fromKeypair.publicKey(),
          params.to,
          params.amount
        );

        return { success: true, txHash: result.hash };
      }

      return { success: false, error: `Transaction failed with status: ${status.status}` };
    } catch (error: any) {
      console.error('Failed to transfer:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Claim dividend from a distribution
   */
  async claimDistribution(
    investorKeypair: Keypair,
    distributionId: string
  ): Promise<{ success: boolean; amount?: string; txHash?: string; error?: string }> {
    try {
      const contract = getRWAContract();
      const investorAccount = await server.getAccount(investorKeypair.publicKey());

      const transaction = new TransactionBuilder(investorAccount, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          contract.call(
            'claim_distribution',
            nativeToScVal(BigInt(distributionId), { type: 'u64' }),
            nativeToScVal(Address.fromString(investorKeypair.publicKey()))
          )
        )
        .setTimeout(30)
        .build();

      const simulated = await server.simulateTransaction(transaction);

      if (rpc.Api.isSimulationError(simulated)) {
        return { success: false, error: `Simulation failed: ${simulated.error}` };
      }

      const prepared = rpc.assembleTransaction(transaction, simulated).build();
      prepared.sign(investorKeypair);

      const result = await server.sendTransaction(prepared);
      const status = await waitForTransaction(result.hash);

      if (status.status === 'SUCCESS' && 'returnValue' in status && status.returnValue) {
        const claimedAmount = scValToNative(status.returnValue);

        // Update database
        await supabase
          .from('rwa_distribution_claims')
          .insert({
            distribution_id: distributionId,
            investor_address: investorKeypair.publicKey(),
            amount: claimedAmount.toString(),
            claimed_at: new Date().toISOString(),
            tx_hash: result.hash,
          });

        return { success: true, amount: claimedAmount.toString(), txHash: result.hash };
      }

      return { success: false, error: `Transaction failed with status: ${status.status}` };
    } catch (error: any) {
      console.error('Failed to claim distribution:', error);
      return { success: false, error: error.message };
    }
  }

  // ============== View Functions ==============

  /**
   * Get asset details
   */
  async getAsset(assetId: string): Promise<RWAAsset | null> {
    try {
      // First try database
      const { data, error } = await supabase
        .from('rwa_assets')
        .select('*')
        .eq('asset_id', assetId)
        .single();

      if (data && !error) {
        return this.mapDbAssetToRWAAsset(data);
      }

      // Fallback to contract
      const contract = getRWAContract();
      const dummyAccount = await this.getDummyAccount();

      const transaction = new TransactionBuilder(dummyAccount, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          contract.call(
            'get_asset',
            nativeToScVal(BigInt(assetId), { type: 'u64' })
          )
        )
        .setTimeout(30)
        .build();

      const simulated = await server.simulateTransaction(transaction);

      if (rpc.Api.isSimulationError(simulated)) {
        return null;
      }

      if (simulated.result) {
        const assetData = scValToNative(simulated.result.retval);
        return assetData ? this.mapContractAssetToRWAAsset(assetData) : null;
      }

      return null;
    } catch (error: any) {
      console.error('Failed to get asset:', error);
      return null;
    }
  }

  /**
   * Get all available RWA assets
   */
  async getAllAssets(): Promise<RWAAsset[]> {
    try {
      const { data, error } = await supabase
        .from('rwa_assets')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch assets:', error);
        return [];
      }

      return (data || []).map(this.mapDbAssetToRWAAsset);
    } catch (error: any) {
      console.error('Failed to get all assets:', error);
      return [];
    }
  }

  /**
   * Get investor details
   */
  async getInvestor(address: string): Promise<Investor | null> {
    try {
      const { data, error } = await supabase
        .from('rwa_investors')
        .select('*')
        .eq('wallet_address', address)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        address: data.wallet_address,
        isAccredited: data.is_accredited,
        isKycVerified: data.is_kyc_verified,
        kycExpiry: new Date(data.kyc_expiry),
        countryCode: data.country_code,
        totalInvested: data.total_invested || '0',
        registeredAt: new Date(data.registered_at),
      };
    } catch (error: any) {
      console.error('Failed to get investor:', error);
      return null;
    }
  }

  /**
   * Get investor's RWA portfolio
   */
  async getPortfolio(investorAddress: string): Promise<RWAPortfolio> {
    try {
      const { data: holdings, error } = await supabase
        .from('rwa_holdings')
        .select(`
          *,
          rwa_assets (
            name,
            symbol,
            asset_value_usd,
            total_supply
          )
        `)
        .eq('investor_address', investorAddress)
        .gt('amount', 0);

      if (error) {
        console.error('Failed to fetch portfolio:', error);
        return { holdings: [], totalValueUsd: '0', unclaimedDividends: '0', assetCount: 0 };
      }

      const mappedHoldings: Holding[] = (holdings || []).map((h: any) => {
        const tokenPrice = h.rwa_assets?.total_supply > 0 
          ? BigInt(h.rwa_assets.asset_value_usd) / BigInt(h.rwa_assets.total_supply)
          : BigInt(0);
        const currentValue = tokenPrice * BigInt(h.amount);

        return {
          assetId: h.asset_id,
          investor: h.investor_address,
          amount: h.amount,
          purchasePrice: h.purchase_price || '0',
          acquiredAt: new Date(h.acquired_at),
          lockedUntil: new Date(h.locked_until || 0),
          currentValue: currentValue.toString(),
        };
      });

      const totalValueUsd = mappedHoldings.reduce(
        (sum, h) => sum + BigInt(h.currentValue || '0'),
        BigInt(0)
      );

      // Get unclaimed dividends
      const unclaimedDividends = await this.getUnclaimedDividends(investorAddress);

      return {
        holdings: mappedHoldings,
        totalValueUsd: totalValueUsd.toString(),
        unclaimedDividends,
        assetCount: mappedHoldings.length,
      };
    } catch (error: any) {
      console.error('Failed to get portfolio:', error);
      return { holdings: [], totalValueUsd: '0', unclaimedDividends: '0', assetCount: 0 };
    }
  }

  /**
   * Get holding details for a specific asset
   */
  async getHolding(assetId: string, investorAddress: string): Promise<Holding | null> {
    try {
      const { data, error } = await supabase
        .from('rwa_holdings')
        .select('*')
        .eq('asset_id', assetId)
        .eq('investor_address', investorAddress)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        assetId: data.asset_id,
        investor: data.investor_address,
        amount: data.amount,
        purchasePrice: data.purchase_price || '0',
        acquiredAt: new Date(data.acquired_at),
        lockedUntil: new Date(data.locked_until || 0),
      };
    } catch (error: any) {
      console.error('Failed to get holding:', error);
      return null;
    }
  }

  /**
   * Check if investor is eligible for an asset
   */
  async checkEligibility(
    assetId: string,
    investorAddress: string
  ): Promise<{ eligible: boolean; reason?: string }> {
    try {
      // Get investor
      const investor = await this.getInvestor(investorAddress);
      if (!investor) {
        return { eligible: false, reason: 'Investor not registered. Please complete KYC.' };
      }

      // Check KYC
      if (!investor.isKycVerified) {
        return { eligible: false, reason: 'KYC verification required.' };
      }

      // Check KYC expiry
      if (investor.kycExpiry < new Date()) {
        return { eligible: false, reason: 'KYC verification has expired. Please renew.' };
      }

      // Get asset
      const asset = await this.getAsset(assetId);
      if (!asset) {
        return { eligible: false, reason: 'Asset not found.' };
      }

      // Check if active
      if (!asset.isActive) {
        return { eligible: false, reason: 'Asset is not available for investment.' };
      }

      // Check accreditation
      if (asset.accreditedOnly && !investor.isAccredited) {
        return { eligible: false, reason: 'This asset is only available to accredited investors.' };
      }

      return { eligible: true };
    } catch (error: any) {
      console.error('Failed to check eligibility:', error);
      return { eligible: false, reason: error.message };
    }
  }

  /**
   * Get total value locked across all RWA assets
   */
  async getTotalValueLocked(): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('rwa_assets')
        .select('asset_value_usd')
        .eq('is_active', true);

      if (error) {
        return '0';
      }

      const total = (data || []).reduce(
        (sum, a) => sum + BigInt(a.asset_value_usd || '0'),
        BigInt(0)
      );

      return total.toString();
    } catch (error: any) {
      console.error('Failed to get TVL:', error);
      return '0';
    }
  }

  /**
   * Get token price for an asset
   */
  async getTokenPrice(assetId: string): Promise<string> {
    const asset = await this.getAsset(assetId);
    if (!asset || BigInt(asset.totalSupply) === BigInt(0)) {
      return '0';
    }

    return (BigInt(asset.assetValueUsd) / BigInt(asset.totalSupply)).toString();
  }

  /**
   * Get available distributions for an investor
   */
  async getAvailableDistributions(investorAddress: string): Promise<Distribution[]> {
    try {
      // Get investor's holdings
      const { data: holdings } = await supabase
        .from('rwa_holdings')
        .select('asset_id')
        .eq('investor_address', investorAddress);

      if (!holdings || holdings.length === 0) {
        return [];
      }

      const assetIds = holdings.map(h => h.asset_id);

      // Get distributions for those assets
      const { data: distributions, error } = await supabase
        .from('rwa_distributions')
        .select('*')
        .in('asset_id', assetIds);

      if (error || !distributions) {
        return [];
      }

      // Filter out already claimed
      const { data: claims } = await supabase
        .from('rwa_distribution_claims')
        .select('distribution_id')
        .eq('investor_address', investorAddress);

      const claimedIds = new Set((claims || []).map(c => c.distribution_id));

      return distributions
        .filter(d => !claimedIds.has(d.distribution_id))
        .map(d => ({
          distributionId: d.distribution_id,
          assetId: d.asset_id,
          totalAmount: d.total_amount,
          perTokenAmount: d.per_token_amount,
          distributionToken: d.distribution_token,
          snapshotTime: new Date(d.snapshot_time),
          createdAt: new Date(d.created_at),
          isClaimed: false,
        }));
    } catch (error: any) {
      console.error('Failed to get available distributions:', error);
      return [];
    }
  }

  // ============== Private Helper Methods ==============

  private async storeAssetInDb(params: CreateAssetParams & { assetId: string; issuer: string }) {
    await supabase
      .from('rwa_assets')
      .insert({
        asset_id: params.assetId,
        name: params.name,
        symbol: params.symbol,
        asset_type: params.assetType,
        total_supply: params.totalSupply,
        circulating_supply: '0',
        issuer: params.issuer,
        custodian: params.custodian,
        asset_value_usd: params.assetValueUsd,
        token_address: params.tokenAddress,
        min_investment: params.minInvestment,
        accredited_only: params.accreditedOnly,
        is_active: true,
        is_transferable: true,
        created_at: new Date().toISOString(),
        last_valuation: new Date().toISOString(),
      });
  }

  private async storeHoldingInDb(params: {
    assetId: string;
    investor: string;
    amount: string;
    purchasePrice: string;
  }): Promise<Holding> {
    const now = new Date();

    await supabase
      .from('rwa_holdings')
      .upsert({
        asset_id: params.assetId,
        investor_address: params.investor,
        amount: params.amount,
        purchase_price: params.purchasePrice,
        acquired_at: now.toISOString(),
        locked_until: null,
      });

    return {
      assetId: params.assetId,
      investor: params.investor,
      amount: params.amount,
      purchasePrice: params.purchasePrice,
      acquiredAt: now,
      lockedUntil: new Date(0),
    };
  }

  private async updateHoldingsAfterTransfer(
    assetId: string,
    from: string,
    to: string,
    amount: string
  ) {
    // Update sender
    const { data: fromHolding } = await supabase
      .from('rwa_holdings')
      .select('amount')
      .eq('asset_id', assetId)
      .eq('investor_address', from)
      .single();

    if (fromHolding) {
      const newAmount = BigInt(fromHolding.amount) - BigInt(amount);
      await supabase
        .from('rwa_holdings')
        .update({ amount: newAmount.toString() })
        .eq('asset_id', assetId)
        .eq('investor_address', from);
    }

    // Update receiver
    const { data: toHolding } = await supabase
      .from('rwa_holdings')
      .select('*')
      .eq('asset_id', assetId)
      .eq('investor_address', to)
      .single();

    if (toHolding) {
      const newAmount = BigInt(toHolding.amount) + BigInt(amount);
      await supabase
        .from('rwa_holdings')
        .update({ amount: newAmount.toString() })
        .eq('asset_id', assetId)
        .eq('investor_address', to);
    } else {
      await supabase
        .from('rwa_holdings')
        .insert({
          asset_id: assetId,
          investor_address: to,
          amount: amount,
          purchase_price: '0',
          acquired_at: new Date().toISOString(),
        });
    }
  }

  private async getUnclaimedDividends(investorAddress: string): Promise<string> {
    const distributions = await this.getAvailableDistributions(investorAddress);
    if (distributions.length === 0) return '0';

    let total = BigInt(0);
    for (const dist of distributions) {
      const holding = await this.getHolding(dist.assetId, investorAddress);
      if (holding && new Date(holding.acquiredAt) <= dist.snapshotTime) {
        total += BigInt(holding.amount) * BigInt(dist.perTokenAmount);
      }
    }

    return total.toString();
  }

  private async getDummyAccount() {
    // Use a public account for read-only queries
    const dummyPubKey = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7';
    return await server.getAccount(dummyPubKey);
  }

  private mapDbAssetToRWAAsset(data: any): RWAAsset {
    return {
      assetId: data.asset_id,
      name: data.name,
      symbol: data.symbol,
      assetType: data.asset_type as AssetType,
      totalSupply: data.total_supply,
      circulatingSupply: data.circulating_supply || '0',
      issuer: data.issuer,
      custodian: data.custodian,
      assetValueUsd: data.asset_value_usd,
      createdAt: new Date(data.created_at),
      lastValuation: new Date(data.last_valuation),
      isActive: data.is_active,
      isTransferable: data.is_transferable,
      minInvestment: data.min_investment,
      accreditedOnly: data.accredited_only,
    };
  }

  private mapContractAssetToRWAAsset(data: any): RWAAsset {
    return {
      assetId: data.asset_id?.toString() || '0',
      name: data.name || '',
      symbol: data.symbol || '',
      assetType: data.asset_type || 'Other',
      totalSupply: data.total_supply?.toString() || '0',
      circulatingSupply: data.circulating_supply?.toString() || '0',
      issuer: data.issuer || '',
      custodian: data.custodian || '',
      assetValueUsd: data.asset_value_usd?.toString() || '0',
      createdAt: new Date(Number(data.created_at) * 1000),
      lastValuation: new Date(Number(data.last_valuation) * 1000),
      isActive: data.is_active || false,
      isTransferable: data.is_transferable || false,
      minInvestment: data.min_investment?.toString() || '0',
      accreditedOnly: data.accredited_only || false,
    };
  }
}

// Export singleton instance
export const rwaService = new RWAService();

// Export types and class for testing
export { RWAService };
