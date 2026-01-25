/**
 * RWA (Real World Asset) Contract Test Suite
 * 
 * Tests for the Stellar/Soroban RWA tokenization contract functionality.
 * These tests validate the contract logic for asset tokenization, compliance,
 * investments, transfers, and dividend distributions.
 */

import { Keypair } from '@stellar/stellar-sdk';

// Type definitions matching the contract
enum AssetType {
  RealEstate = 'RealEstate',
  Commodity = 'Commodity',
  Bond = 'Bond',
  Equity = 'Equity',
  Security = 'Security',
  Other = 'Other',
}

interface RWAAsset {
  assetId: bigint;
  name: string;
  symbol: string;
  assetType: AssetType;
  totalSupply: bigint;
  circulatingSupply: bigint;
  assetValueUsd: bigint;
  custodian: string;
  tokenAddress: string;
  minInvestment: bigint;
  accreditedOnly: boolean;
  isActive: boolean;
  isTransferable: boolean;
  createdAt: bigint;
}

interface Investor {
  address: string;
  isAccredited: boolean;
  isKycVerified: boolean;
  countryCode: string;
  kycExpiry: bigint;
  registeredAt: bigint;
  isBlacklisted: boolean;
}

interface Holding {
  investorAddress: string;
  assetId: bigint;
  amount: bigint;
  purchaseValue: bigint;
  purchaseDate: bigint;
}

interface Distribution {
  distributionId: bigint;
  assetId: bigint;
  totalAmount: bigint;
  tokenAddress: string;
  snapshotTime: bigint;
  snapshotSupply: bigint;
  isClosed: boolean;
}

// Simulated RWA Contract for Testing
class MockRWAContract {
  private admin: string = '';
  private assetCounter: bigint = BigInt(0);
  private distributionCounter: bigint = BigInt(0);
  private tvl: bigint = BigInt(0);
  private assets: Map<bigint, RWAAsset> = new Map();
  private investors: Map<string, Investor> = new Map();
  private holdings: Map<string, Holding> = new Map();
  private distributions: Map<bigint, Distribution> = new Map();
  private whitelistedCountries: Set<string> = new Set();
  private blacklistedAddresses: Set<string> = new Set();
  private distributionClaims: Map<string, boolean> = new Map();

  initialize(admin: string): void {
    if (this.admin) {
      throw new Error('Contract already initialized');
    }
    this.admin = admin;
  }

  setAdmin(newAdmin: string): void {
    this.admin = newAdmin;
  }

  whitelistCountry(countryCode: string, whitelist: boolean): void {
    if (whitelist) {
      this.whitelistedCountries.add(countryCode);
    } else {
      this.whitelistedCountries.delete(countryCode);
    }
  }

  blacklistAddress(address: string, blacklist: boolean): void {
    if (blacklist) {
      this.blacklistedAddresses.add(address);
    } else {
      this.blacklistedAddresses.delete(address);
    }
  }

  createAsset(
    name: string,
    symbol: string,
    assetType: AssetType,
    totalSupply: bigint,
    assetValueUsd: bigint,
    custodian: string,
    tokenAddress: string,
    minInvestment: bigint,
    accreditedOnly: boolean
  ): bigint {
    if (totalSupply <= BigInt(0) || assetValueUsd <= BigInt(0)) {
      throw new Error('Invalid supply or value');
    }

    this.assetCounter++;
    const assetId = this.assetCounter;

    const asset: RWAAsset = {
      assetId,
      name,
      symbol,
      assetType,
      totalSupply,
      circulatingSupply: BigInt(0),
      assetValueUsd,
      custodian,
      tokenAddress,
      minInvestment,
      accreditedOnly,
      isActive: true,
      isTransferable: true,
      createdAt: BigInt(Date.now()),
    };

    this.assets.set(assetId, asset);
    this.tvl += assetValueUsd;

    return assetId;
  }

  updateValuation(assetId: bigint, newValueUsd: bigint): boolean {
    const asset = this.assets.get(assetId);
    if (!asset) return false;

    this.tvl -= asset.assetValueUsd;
    asset.assetValueUsd = newValueUsd;
    this.tvl += newValueUsd;

    return true;
  }

  setAssetTransferable(assetId: bigint, transferable: boolean): void {
    const asset = this.assets.get(assetId);
    if (!asset) throw new Error('Asset not found');
    asset.isTransferable = transferable;
  }

  registerInvestor(
    address: string,
    isAccredited: boolean,
    countryCode: string,
    kycExpiry: bigint
  ): boolean {
    if (!this.whitelistedCountries.has(countryCode)) {
      throw new Error('Country not whitelisted');
    }

    const investor: Investor = {
      address,
      isAccredited,
      isKycVerified: true,
      countryCode,
      kycExpiry,
      registeredAt: BigInt(Date.now()),
      isBlacklisted: false,
    };

    this.investors.set(address, investor);
    return true;
  }

  updateAccreditation(address: string, isAccredited: boolean): void {
    const investor = this.investors.get(address);
    if (!investor) throw new Error('Investor not found');
    investor.isAccredited = isAccredited;
  }

  invest(
    assetId: bigint,
    investorAddress: string,
    amount: bigint,
    paymentToken: string,
    paymentAmount: bigint
  ): boolean {
    const asset = this.assets.get(assetId);
    const investor = this.investors.get(investorAddress);

    if (!asset) throw new Error('Asset not found');
    if (!investor) throw new Error('Investor not registered');
    if (investor.isBlacklisted || this.blacklistedAddresses.has(investorAddress)) {
      throw new Error('Investor is blacklisted');
    }
    if (asset.accreditedOnly && !investor.isAccredited) {
      throw new Error('Accredited investors only');
    }
    if (amount < asset.minInvestment) {
      throw new Error('Below minimum investment');
    }
    if (asset.circulatingSupply + amount > asset.totalSupply) {
      throw new Error('Exceeds total supply');
    }

    const holdingKey = `${assetId}-${investorAddress}`;
    const existingHolding = this.holdings.get(holdingKey);

    if (existingHolding) {
      existingHolding.amount += amount;
      existingHolding.purchaseValue += paymentAmount;
    } else {
      this.holdings.set(holdingKey, {
        investorAddress,
        assetId,
        amount,
        purchaseValue: paymentAmount,
        purchaseDate: BigInt(Date.now()),
      });
    }

    asset.circulatingSupply += amount;
    return true;
  }

  transfer(
    assetId: bigint,
    fromAddress: string,
    toAddress: string,
    amount: bigint
  ): boolean {
    const asset = this.assets.get(assetId);
    if (!asset) throw new Error('Asset not found');
    if (!asset.isTransferable) throw new Error('Asset transfers disabled');

    const fromInvestor = this.investors.get(fromAddress);
    const toInvestor = this.investors.get(toAddress);

    if (!fromInvestor) throw new Error('Sender not registered');
    if (!toInvestor) throw new Error('Receiver not registered');
    if (asset.accreditedOnly && !toInvestor.isAccredited) {
      throw new Error('Receiver must be accredited');
    }

    const fromKey = `${assetId}-${fromAddress}`;
    const toKey = `${assetId}-${toAddress}`;

    const fromHolding = this.holdings.get(fromKey);
    if (!fromHolding || fromHolding.amount < amount) {
      throw new Error('Insufficient balance');
    }

    fromHolding.amount -= amount;

    const toHolding = this.holdings.get(toKey);
    if (toHolding) {
      toHolding.amount += amount;
    } else {
      this.holdings.set(toKey, {
        investorAddress: toAddress,
        assetId,
        amount,
        purchaseValue: BigInt(0),
        purchaseDate: BigInt(Date.now()),
      });
    }

    return true;
  }

  createDistribution(
    assetId: bigint,
    totalAmount: bigint,
    tokenAddress: string
  ): bigint {
    const asset = this.assets.get(assetId);
    if (!asset) throw new Error('Asset not found');

    this.distributionCounter++;
    const distributionId = this.distributionCounter;

    const distribution: Distribution = {
      distributionId,
      assetId,
      totalAmount,
      tokenAddress,
      snapshotTime: BigInt(Date.now()),
      snapshotSupply: asset.circulatingSupply,
      isClosed: false,
    };

    this.distributions.set(distributionId, distribution);
    return distributionId;
  }

  claimDistribution(distributionId: bigint, investorAddress: string): bigint {
    const distribution = this.distributions.get(distributionId);
    if (!distribution) throw new Error('Distribution not found');

    const claimKey = `${distributionId}-${investorAddress}`;
    if (this.distributionClaims.get(claimKey)) {
      throw new Error('Already claimed');
    }

    const holdingKey = `${distribution.assetId}-${investorAddress}`;
    const holding = this.holdings.get(holdingKey);
    if (!holding || holding.amount === BigInt(0)) {
      throw new Error('No holdings to claim');
    }

    // Calculate proportional share
    const claimAmount = (distribution.totalAmount * holding.amount) / distribution.snapshotSupply;

    this.distributionClaims.set(claimKey, true);
    return claimAmount;
  }

  // Query functions
  getAsset(assetId: bigint): RWAAsset | null {
    return this.assets.get(assetId) || null;
  }

  getInvestor(address: string): Investor | null {
    return this.investors.get(address) || null;
  }

  getHolding(assetId: bigint, investorAddress: string): Holding | null {
    return this.holdings.get(`${assetId}-${investorAddress}`) || null;
  }

  getDistribution(distributionId: bigint): Distribution | null {
    return this.distributions.get(distributionId) || null;
  }

  isDistributionClaimed(distributionId: bigint, investorAddress: string): boolean {
    return this.distributionClaims.get(`${distributionId}-${investorAddress}`) || false;
  }

  checkEligibility(assetId: bigint, investorAddress: string): boolean {
    const asset = this.assets.get(assetId);
    const investor = this.investors.get(investorAddress);

    if (!asset || !investor) return false;
    if (investor.isBlacklisted) return false;
    if (asset.accreditedOnly && !investor.isAccredited) return false;
    if (!this.whitelistedCountries.has(investor.countryCode)) return false;

    return true;
  }

  getTokenPrice(assetId: bigint): bigint {
    const asset = this.assets.get(assetId);
    if (!asset || asset.totalSupply === BigInt(0)) return BigInt(0);
    return asset.assetValueUsd / asset.totalSupply;
  }

  getAssetCount(): bigint {
    return this.assetCounter;
  }

  getTvl(): bigint {
    return this.tvl;
  }
}

describe('RWA Contract Tests', () => {
  let contract: MockRWAContract;
  let admin: string;
  let custodian: string;
  let investor1: string;
  let investor2: string;
  let tokenAddress: string;
  let paymentToken: string;

  beforeEach(() => {
    contract = new MockRWAContract();
    admin = Keypair.random().publicKey();
    custodian = Keypair.random().publicKey();
    investor1 = Keypair.random().publicKey();
    investor2 = Keypair.random().publicKey();
    tokenAddress = Keypair.random().publicKey();
    paymentToken = Keypair.random().publicKey();
  });

  describe('Initialization', () => {
    test('should initialize contract successfully', () => {
      contract.initialize(admin);
      expect(contract.getAssetCount()).toBe(BigInt(0));
      expect(contract.getTvl()).toBe(BigInt(0));
    });

    test('should fail when initializing twice', () => {
      contract.initialize(admin);
      expect(() => contract.initialize(admin)).toThrow('Contract already initialized');
    });
  });

  describe('Admin Functions', () => {
    beforeEach(() => {
      contract.initialize(admin);
    });

    test('should whitelist country', () => {
      contract.whitelistCountry('US', true);
      
      // Verify by registering investor
      const investor = Keypair.random().publicKey();
      const result = contract.registerInvestor(
        investor,
        true,
        'US',
        BigInt(Date.now() + 365 * 86400000)
      );
      expect(result).toBe(true);
    });

    test('should remove country from whitelist', () => {
      contract.whitelistCountry('US', true);
      contract.whitelistCountry('US', false);
      
      const investor = Keypair.random().publicKey();
      expect(() => 
        contract.registerInvestor(investor, true, 'US', BigInt(Date.now() + 365 * 86400000))
      ).toThrow('Country not whitelisted');
    });

    test('should blacklist address', () => {
      contract.whitelistCountry('US', true);
      contract.blacklistAddress(investor1, true);
      
      contract.registerInvestor(investor1, true, 'US', BigInt(Date.now() + 365 * 86400000));
      
      // Create asset
      const assetId = contract.createAsset(
        'Test Property',
        'TPROP',
        AssetType.RealEstate,
        BigInt(1000000),
        BigInt(100000000),
        custodian,
        tokenAddress,
        BigInt(100),
        false
      );

      expect(() => 
        contract.invest(assetId, investor1, BigInt(1000), paymentToken, BigInt(100000))
      ).toThrow('Investor is blacklisted');
    });
  });

  describe('Asset Creation', () => {
    beforeEach(() => {
      contract.initialize(admin);
    });

    test('should create asset successfully', () => {
      const assetId = contract.createAsset(
        'Manhattan Tower',
        'MTWR',
        AssetType.RealEstate,
        BigInt(1000000),
        BigInt(50000000000),
        custodian,
        tokenAddress,
        BigInt(1000),
        true
      );

      expect(assetId).toBe(BigInt(1));
      expect(contract.getAssetCount()).toBe(BigInt(1));

      const asset = contract.getAsset(assetId);
      expect(asset).not.toBeNull();
      expect(asset?.name).toBe('Manhattan Tower');
      expect(asset?.symbol).toBe('MTWR');
      expect(asset?.totalSupply).toBe(BigInt(1000000));
      expect(asset?.circulatingSupply).toBe(BigInt(0));
      expect(asset?.isActive).toBe(true);
      expect(asset?.accreditedOnly).toBe(true);
    });

    test('should create multiple assets', () => {
      contract.createAsset('Asset 1', 'A1', AssetType.RealEstate, BigInt(1000000), BigInt(100000000), custodian, tokenAddress, BigInt(100), false);
      contract.createAsset('Asset 2', 'A2', AssetType.Commodity, BigInt(500000), BigInt(50000000), custodian, tokenAddress, BigInt(50), false);
      contract.createAsset('Asset 3', 'A3', AssetType.Bond, BigInt(2000000), BigInt(200000000), custodian, tokenAddress, BigInt(1000), true);

      expect(contract.getAssetCount()).toBe(BigInt(3));
      expect(contract.getTvl()).toBe(BigInt(350000000));
    });

    test('should fail with invalid supply', () => {
      expect(() => 
        contract.createAsset('Bad', 'BAD', AssetType.Other, BigInt(0), BigInt(100), custodian, tokenAddress, BigInt(10), false)
      ).toThrow('Invalid supply or value');
    });

    test('should fail with invalid value', () => {
      expect(() => 
        contract.createAsset('Bad', 'BAD', AssetType.Other, BigInt(100), BigInt(0), custodian, tokenAddress, BigInt(10), false)
      ).toThrow('Invalid supply or value');
    });
  });

  describe('Valuation Updates', () => {
    beforeEach(() => {
      contract.initialize(admin);
    });

    test('should update asset valuation', () => {
      const assetId = contract.createAsset(
        'Property',
        'PROP',
        AssetType.RealEstate,
        BigInt(1000000),
        BigInt(100000000),
        custodian,
        tokenAddress,
        BigInt(100),
        false
      );

      expect(contract.getTvl()).toBe(BigInt(100000000));

      contract.updateValuation(assetId, BigInt(150000000));

      const asset = contract.getAsset(assetId);
      expect(asset?.assetValueUsd).toBe(BigInt(150000000));
      expect(contract.getTvl()).toBe(BigInt(150000000));
    });

    test('should return false for nonexistent asset', () => {
      const result = contract.updateValuation(BigInt(999), BigInt(100000000));
      expect(result).toBe(false);
    });
  });

  describe('Investor Registration', () => {
    beforeEach(() => {
      contract.initialize(admin);
      contract.whitelistCountry('US', true);
      contract.whitelistCountry('UK', true);
    });

    test('should register investor successfully', () => {
      const result = contract.registerInvestor(
        investor1,
        true,
        'US',
        BigInt(Date.now() + 365 * 86400000)
      );

      expect(result).toBe(true);

      const investor = contract.getInvestor(investor1);
      expect(investor).not.toBeNull();
      expect(investor?.isAccredited).toBe(true);
      expect(investor?.countryCode).toBe('US');
      expect(investor?.isKycVerified).toBe(true);
    });

    test('should fail with non-whitelisted country', () => {
      expect(() => 
        contract.registerInvestor(investor1, true, 'XX', BigInt(Date.now() + 365 * 86400000))
      ).toThrow('Country not whitelisted');
    });

    test('should update accreditation status', () => {
      contract.registerInvestor(investor1, false, 'US', BigInt(Date.now() + 365 * 86400000));
      
      let investor = contract.getInvestor(investor1);
      expect(investor?.isAccredited).toBe(false);

      contract.updateAccreditation(investor1, true);
      
      investor = contract.getInvestor(investor1);
      expect(investor?.isAccredited).toBe(true);
    });
  });

  describe('Investments', () => {
    let assetId: bigint;

    beforeEach(() => {
      contract.initialize(admin);
      contract.whitelistCountry('US', true);
      
      contract.registerInvestor(investor1, true, 'US', BigInt(Date.now() + 365 * 86400000));
      contract.registerInvestor(investor2, false, 'US', BigInt(Date.now() + 365 * 86400000));

      assetId = contract.createAsset(
        'Test Property',
        'TPROP',
        AssetType.RealEstate,
        BigInt(1000000),
        BigInt(100000000),
        custodian,
        tokenAddress,
        BigInt(100),
        false
      );
    });

    test('should invest successfully', () => {
      const result = contract.invest(assetId, investor1, BigInt(1000), paymentToken, BigInt(100000));
      
      expect(result).toBe(true);

      const holding = contract.getHolding(assetId, investor1);
      expect(holding?.amount).toBe(BigInt(1000));
      expect(holding?.purchaseValue).toBe(BigInt(100000));

      const asset = contract.getAsset(assetId);
      expect(asset?.circulatingSupply).toBe(BigInt(1000));
    });

    test('should accumulate investments', () => {
      contract.invest(assetId, investor1, BigInt(1000), paymentToken, BigInt(100000));
      contract.invest(assetId, investor1, BigInt(2000), paymentToken, BigInt(200000));

      const holding = contract.getHolding(assetId, investor1);
      expect(holding?.amount).toBe(BigInt(3000));
      expect(holding?.purchaseValue).toBe(BigInt(300000));
    });

    test('should fail for unregistered investor', () => {
      const unregistered = Keypair.random().publicKey();
      expect(() => 
        contract.invest(assetId, unregistered, BigInt(1000), paymentToken, BigInt(100000))
      ).toThrow('Investor not registered');
    });

    test('should fail below minimum investment', () => {
      expect(() => 
        contract.invest(assetId, investor1, BigInt(50), paymentToken, BigInt(5000))
      ).toThrow('Below minimum investment');
    });

    test('should fail for non-accredited on accredited-only asset', () => {
      const accreditedAssetId = contract.createAsset(
        'Accredited Only',
        'ACC',
        AssetType.Security,
        BigInt(1000000),
        BigInt(100000000),
        custodian,
        tokenAddress,
        BigInt(100),
        true
      );

      expect(() => 
        contract.invest(accreditedAssetId, investor2, BigInt(1000), paymentToken, BigInt(100000))
      ).toThrow('Accredited investors only');
    });

    test('should fail when exceeding total supply', () => {
      const smallAssetId = contract.createAsset(
        'Small Asset',
        'SMLL',
        AssetType.Other,
        BigInt(1000),
        BigInt(100000),
        custodian,
        tokenAddress,
        BigInt(100),
        false
      );

      expect(() => 
        contract.invest(smallAssetId, investor1, BigInt(2000), paymentToken, BigInt(200000))
      ).toThrow('Exceeds total supply');
    });
  });

  describe('Transfers', () => {
    let assetId: bigint;

    beforeEach(() => {
      contract.initialize(admin);
      contract.whitelistCountry('US', true);
      
      contract.registerInvestor(investor1, true, 'US', BigInt(Date.now() + 365 * 86400000));
      contract.registerInvestor(investor2, true, 'US', BigInt(Date.now() + 365 * 86400000));

      assetId = contract.createAsset(
        'Transferable Asset',
        'TRFR',
        AssetType.RealEstate,
        BigInt(1000000),
        BigInt(100000000),
        custodian,
        tokenAddress,
        BigInt(100),
        false
      );

      contract.invest(assetId, investor1, BigInt(5000), paymentToken, BigInt(500000));
    });

    test('should transfer successfully', () => {
      const result = contract.transfer(assetId, investor1, investor2, BigInt(2000));
      
      expect(result).toBe(true);

      const holding1 = contract.getHolding(assetId, investor1);
      const holding2 = contract.getHolding(assetId, investor2);

      expect(holding1?.amount).toBe(BigInt(3000));
      expect(holding2?.amount).toBe(BigInt(2000));
    });

    test('should fail when transfers disabled', () => {
      contract.setAssetTransferable(assetId, false);

      expect(() => 
        contract.transfer(assetId, investor1, investor2, BigInt(2000))
      ).toThrow('Asset transfers disabled');
    });

    test('should fail with insufficient balance', () => {
      expect(() => 
        contract.transfer(assetId, investor1, investor2, BigInt(10000))
      ).toThrow('Insufficient balance');
    });

    test('should fail for unregistered sender', () => {
      const unregistered = Keypair.random().publicKey();
      expect(() => 
        contract.transfer(assetId, unregistered, investor2, BigInt(1000))
      ).toThrow('Sender not registered');
    });

    test('should fail for unregistered receiver', () => {
      const unregistered = Keypair.random().publicKey();
      expect(() => 
        contract.transfer(assetId, investor1, unregistered, BigInt(1000))
      ).toThrow('Receiver not registered');
    });
  });

  describe('Distributions', () => {
    let assetId: bigint;
    let distributionId: bigint;

    beforeEach(() => {
      contract.initialize(admin);
      contract.whitelistCountry('US', true);
      
      contract.registerInvestor(investor1, true, 'US', BigInt(Date.now() + 365 * 86400000));
      contract.registerInvestor(investor2, true, 'US', BigInt(Date.now() + 365 * 86400000));

      assetId = contract.createAsset(
        'Dividend Asset',
        'DIV',
        AssetType.RealEstate,
        BigInt(100000),
        BigInt(10000000),
        custodian,
        tokenAddress,
        BigInt(100),
        false
      );

      // Investor 1 buys 10% (10000 out of 100000)
      contract.invest(assetId, investor1, BigInt(10000), paymentToken, BigInt(1000000));
      
      // Investor 2 buys 40% (40000 out of 100000)
      contract.invest(assetId, investor2, BigInt(40000), paymentToken, BigInt(4000000));
    });

    test('should create distribution successfully', () => {
      distributionId = contract.createDistribution(assetId, BigInt(100000), paymentToken);

      expect(distributionId).toBe(BigInt(1));

      const distribution = contract.getDistribution(distributionId);
      expect(distribution).not.toBeNull();
      expect(distribution?.assetId).toBe(assetId);
      expect(distribution?.totalAmount).toBe(BigInt(100000));
      expect(distribution?.snapshotSupply).toBe(BigInt(50000)); // 10000 + 40000
    });

    test('should claim distribution correctly', () => {
      distributionId = contract.createDistribution(assetId, BigInt(100000), paymentToken);

      // Investor 1 should get 10000/50000 * 100000 = 20000
      const claim1 = contract.claimDistribution(distributionId, investor1);
      expect(claim1).toBe(BigInt(20000));

      // Investor 2 should get 40000/50000 * 100000 = 80000
      const claim2 = contract.claimDistribution(distributionId, investor2);
      expect(claim2).toBe(BigInt(80000));
    });

    test('should fail claiming twice', () => {
      distributionId = contract.createDistribution(assetId, BigInt(100000), paymentToken);

      contract.claimDistribution(distributionId, investor1);
      
      expect(() => 
        contract.claimDistribution(distributionId, investor1)
      ).toThrow('Already claimed');
    });

    test('should track claimed status', () => {
      distributionId = contract.createDistribution(assetId, BigInt(100000), paymentToken);

      expect(contract.isDistributionClaimed(distributionId, investor1)).toBe(false);
      
      contract.claimDistribution(distributionId, investor1);
      
      expect(contract.isDistributionClaimed(distributionId, investor1)).toBe(true);
    });
  });

  describe('Query Functions', () => {
    beforeEach(() => {
      contract.initialize(admin);
    });

    test('should get token price', () => {
      const assetId = contract.createAsset(
        'Priced Asset',
        'PRCE',
        AssetType.RealEstate,
        BigInt(1000000),
        BigInt(100000000),
        custodian,
        tokenAddress,
        BigInt(100),
        false
      );

      // $1M / 1M tokens = $1 per token = 100 cents
      const price = contract.getTokenPrice(assetId);
      expect(price).toBe(BigInt(100));
    });

    test('should check eligibility - eligible', () => {
      contract.whitelistCountry('US', true);
      
      const assetId = contract.createAsset(
        'Test',
        'TST',
        AssetType.Security,
        BigInt(1000000),
        BigInt(100000000),
        custodian,
        tokenAddress,
        BigInt(100),
        true
      );

      contract.registerInvestor(investor1, true, 'US', BigInt(Date.now() + 365 * 86400000));

      expect(contract.checkEligibility(assetId, investor1)).toBe(true);
    });

    test('should check eligibility - not accredited', () => {
      contract.whitelistCountry('US', true);
      
      const assetId = contract.createAsset(
        'Test',
        'TST',
        AssetType.Security,
        BigInt(1000000),
        BigInt(100000000),
        custodian,
        tokenAddress,
        BigInt(100),
        true
      );

      contract.registerInvestor(investor1, false, 'US', BigInt(Date.now() + 365 * 86400000));

      expect(contract.checkEligibility(assetId, investor1)).toBe(false);
    });

    test('should return null for nonexistent asset', () => {
      expect(contract.getAsset(BigInt(999))).toBeNull();
    });

    test('should return null for unregistered investor', () => {
      expect(contract.getInvestor(Keypair.random().publicKey())).toBeNull();
    });
  });

  describe('Integration Scenarios', () => {
    beforeEach(() => {
      contract.initialize(admin);
      contract.whitelistCountry('US', true);
      contract.whitelistCountry('UK', true);
    });

    test('should handle complete investment lifecycle', () => {
      // 1. Create real estate asset
      const assetId = contract.createAsset(
        'Downtown Office Building',
        'DWOB',
        AssetType.RealEstate,
        BigInt(1000000),
        BigInt(50000000000), // $500M
        custodian,
        tokenAddress,
        BigInt(1000),
        false
      );

      // 2. Register multiple investors
      const investors = [
        { addr: Keypair.random().publicKey(), accredited: true, country: 'US' },
        { addr: Keypair.random().publicKey(), accredited: true, country: 'UK' },
        { addr: Keypair.random().publicKey(), accredited: false, country: 'US' },
      ];

      for (const inv of investors) {
        contract.registerInvestor(
          inv.addr,
          inv.accredited,
          inv.country,
          BigInt(Date.now() + 365 * 86400000)
        );
      }

      // 3. Process investments
      contract.invest(assetId, investors[0].addr, BigInt(50000), paymentToken, BigInt(2500000000)); // $25M
      contract.invest(assetId, investors[1].addr, BigInt(30000), paymentToken, BigInt(1500000000)); // $15M
      contract.invest(assetId, investors[2].addr, BigInt(20000), paymentToken, BigInt(1000000000)); // $10M

      const asset = contract.getAsset(assetId);
      expect(asset?.circulatingSupply).toBe(BigInt(100000));

      // 4. Transfer between investors
      contract.transfer(assetId, investors[0].addr, investors[2].addr, BigInt(10000));

      expect(contract.getHolding(assetId, investors[0].addr)?.amount).toBe(BigInt(40000));
      expect(contract.getHolding(assetId, investors[2].addr)?.amount).toBe(BigInt(30000));

      // 5. Create and distribute dividends
      const distId = contract.createDistribution(assetId, BigInt(500000000), paymentToken); // $5M dividend

      // Claims based on holdings: 40k, 30k, 30k = 100k total
      const claim1 = contract.claimDistribution(distId, investors[0].addr); // 40%
      const claim2 = contract.claimDistribution(distId, investors[1].addr); // 30%
      const claim3 = contract.claimDistribution(distId, investors[2].addr); // 30%

      expect(claim1).toBe(BigInt(200000000)); // $2M
      expect(claim2).toBe(BigInt(150000000)); // $1.5M
      expect(claim3).toBe(BigInt(150000000)); // $1.5M
    });

    test('should handle asset valuation changes', () => {
      const assetId = contract.createAsset(
        'Property Portfolio',
        'PRTF',
        AssetType.RealEstate,
        BigInt(1000000),
        BigInt(100000000000), // $1B
        custodian,
        tokenAddress,
        BigInt(1000),
        false
      );

      expect(contract.getTvl()).toBe(BigInt(100000000000));

      // Market appreciation
      contract.updateValuation(assetId, BigInt(120000000000)); // +20%
      expect(contract.getTvl()).toBe(BigInt(120000000000));
      expect(contract.getTokenPrice(assetId)).toBe(BigInt(120000)); // $1200/token

      // Market correction
      contract.updateValuation(assetId, BigInt(90000000000)); // -25%
      expect(contract.getTvl()).toBe(BigInt(90000000000));
      expect(contract.getTokenPrice(assetId)).toBe(BigInt(90000)); // $900/token
    });
  });
});
