// Real World Asset (RWA) Tokenization Contract
// 
// This contract enables tokenization and management of real-world assets on Stellar.
// Supports:
// - Asset tokenization (real estate, commodities, securities, etc.)
// - Fractional ownership
// - Asset verification and compliance
// - Dividend/yield distribution
// - Transfer restrictions for regulated assets

use soroban_sdk::{
    contract, contractimpl, contracttype, Env, Address, String, Symbol, token,
    Vec, Map,
};

// ============== Data Structures ==============

/// Represents a tokenized real-world asset
#[contracttype]
#[derive(Clone)]
pub struct RWAAsset {
    pub asset_id: u64,
    pub name: String,
    pub symbol: String,
    pub asset_type: AssetType,
    pub total_supply: i128,
    pub circulating_supply: i128,
    pub issuer: Address,
    pub custodian: Address,           // Legal custodian of the physical asset
    pub asset_value_usd: i128,        // Total value in USD cents
    pub created_at: u64,
    pub last_valuation: u64,          // Timestamp of last valuation
    pub is_active: bool,
    pub is_transferable: bool,        // Can be restricted for compliance
    pub min_investment: i128,         // Minimum investment amount
    pub accredited_only: bool,        // Only accredited investors can hold
}

/// Type of real-world asset
#[contracttype]
#[derive(Clone, PartialEq)]
pub enum AssetType {
    RealEstate,
    Commodity,
    Security,
    Bond,
    Art,
    Collectible,
    Invoice,           // Invoice factoring
    Equipment,
    IntellectualProperty,
    Other,
}

/// Investor information and holdings
#[contracttype]
#[derive(Clone)]
pub struct Investor {
    pub address: Address,
    pub is_accredited: bool,
    pub is_kyc_verified: bool,
    pub kyc_expiry: u64,
    pub country_code: String,         // For compliance restrictions
    pub total_invested: i128,
    pub registered_at: u64,
}

/// Holding record for an investor in a specific asset
#[contracttype]
#[derive(Clone)]
pub struct Holding {
    pub asset_id: u64,
    pub investor: Address,
    pub amount: i128,
    pub purchase_price: i128,         // Price paid per token
    pub acquired_at: u64,
    pub locked_until: u64,            // Lock-up period
}

/// Dividend/Yield distribution record
#[contracttype]
#[derive(Clone)]
pub struct Distribution {
    pub distribution_id: u64,
    pub asset_id: u64,
    pub total_amount: i128,
    pub per_token_amount: i128,
    pub distribution_token: Address,  // Token used for distribution
    pub snapshot_time: u64,
    pub created_at: u64,
    pub is_claimed: bool,
}

/// Storage keys
#[contracttype]
pub enum RWAKey {
    Admin,
    AssetCounter,
    DistributionCounter,
    Asset(u64),                       // asset_id -> RWAAsset
    Investor(Address),                // address -> Investor
    Holding(u64, Address),            // (asset_id, investor) -> Holding
    Distribution(u64),                // distribution_id -> Distribution
    ClaimedDistribution(u64, Address), // (distribution_id, investor) -> bool
    WhitelistedCountry(String),       // country_code -> bool
    BlacklistedAddress(Address),      // address -> bool
    AssetToken(u64),                  // asset_id -> token Address
    TotalValueLocked,                 // Total USD value locked
}

// ============== Contract Implementation ==============

#[contract]
pub struct RWAContract;

#[contractimpl]
impl RWAContract {
    
    // ============== Admin Functions ==============
    
    /// Initialize the contract with an admin
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().persistent().has(&RWAKey::Admin) {
            panic!("Contract already initialized");
        }
        admin.require_auth();
        
        env.storage().persistent().set(&RWAKey::Admin, &admin);
        env.storage().persistent().set(&RWAKey::AssetCounter, &0u64);
        env.storage().persistent().set(&RWAKey::DistributionCounter, &0u64);
        env.storage().persistent().set(&RWAKey::TotalValueLocked, &0i128);
        
        env.events().publish(
            (Symbol::new(&env, "RWAInitialized"),),
            admin,
        );
    }
    
    /// Update admin address
    pub fn set_admin(env: Env, new_admin: Address) {
        let admin: Address = env.storage().persistent()
            .get(&RWAKey::Admin)
            .expect("Contract not initialized");
        admin.require_auth();
        
        env.storage().persistent().set(&RWAKey::Admin, &new_admin);
        
        env.events().publish(
            (Symbol::new(&env, "AdminUpdated"),),
            new_admin,
        );
    }
    
    /// Whitelist a country for investment
    pub fn whitelist_country(env: Env, country_code: String, allowed: bool) {
        let admin: Address = env.storage().persistent()
            .get(&RWAKey::Admin)
            .expect("Contract not initialized");
        admin.require_auth();
        
        env.storage().persistent().set(&RWAKey::WhitelistedCountry(country_code.clone()), &allowed);
        
        env.events().publish(
            (Symbol::new(&env, "CountryWhitelisted"),),
            (country_code, allowed),
        );
    }
    
    /// Blacklist an address
    pub fn blacklist_address(env: Env, address: Address, blacklisted: bool) {
        let admin: Address = env.storage().persistent()
            .get(&RWAKey::Admin)
            .expect("Contract not initialized");
        admin.require_auth();
        
        env.storage().persistent().set(&RWAKey::BlacklistedAddress(address.clone()), &blacklisted);
        
        env.events().publish(
            (Symbol::new(&env, "AddressBlacklisted"),),
            (address, blacklisted),
        );
    }
    
    // ============== Asset Management ==============
    
    /// Create/tokenize a new real-world asset
    pub fn create_asset(
        env: Env,
        name: String,
        symbol: String,
        asset_type: AssetType,
        total_supply: i128,
        asset_value_usd: i128,
        custodian: Address,
        token_address: Address,
        min_investment: i128,
        accredited_only: bool,
    ) -> u64 {
        let admin: Address = env.storage().persistent()
            .get(&RWAKey::Admin)
            .expect("Contract not initialized");
        admin.require_auth();
        
        if total_supply <= 0 || asset_value_usd <= 0 {
            panic!("Invalid supply or value");
        }
        
        // Get next asset ID
        let asset_id: u64 = env.storage().persistent()
            .get(&RWAKey::AssetCounter)
            .unwrap_or(0) + 1;
        
        let asset = RWAAsset {
            asset_id,
            name: name.clone(),
            symbol: symbol.clone(),
            asset_type: asset_type.clone(),
            total_supply,
            circulating_supply: 0,
            issuer: admin.clone(),
            custodian: custodian.clone(),
            asset_value_usd,
            created_at: env.ledger().timestamp(),
            last_valuation: env.ledger().timestamp(),
            is_active: true,
            is_transferable: true,
            min_investment,
            accredited_only,
        };
        
        // Store asset
        env.storage().persistent().set(&RWAKey::Asset(asset_id), &asset);
        env.storage().persistent().set(&RWAKey::AssetToken(asset_id), &token_address);
        env.storage().persistent().set(&RWAKey::AssetCounter, &asset_id);
        
        // Update TVL
        let tvl: i128 = env.storage().persistent()
            .get(&RWAKey::TotalValueLocked)
            .unwrap_or(0);
        env.storage().persistent().set(&RWAKey::TotalValueLocked, &(tvl + asset_value_usd));
        
        env.events().publish(
            (Symbol::new(&env, "AssetCreated"),),
            (asset_id, name, symbol, total_supply, asset_value_usd),
        );
        
        asset_id
    }
    
    /// Update asset valuation
    pub fn update_valuation(env: Env, asset_id: u64, new_value_usd: i128) -> bool {
        let admin: Address = env.storage().persistent()
            .get(&RWAKey::Admin)
            .expect("Contract not initialized");
        admin.require_auth();
        
        let mut asset: RWAAsset = match env.storage().persistent().get(&RWAKey::Asset(asset_id)) {
            Some(a) => a,
            None => return false,
        };
        
        let old_value = asset.asset_value_usd;
        asset.asset_value_usd = new_value_usd;
        asset.last_valuation = env.ledger().timestamp();
        
        env.storage().persistent().set(&RWAKey::Asset(asset_id), &asset);
        
        // Update TVL
        let tvl: i128 = env.storage().persistent()
            .get(&RWAKey::TotalValueLocked)
            .unwrap_or(0);
        env.storage().persistent().set(&RWAKey::TotalValueLocked, &(tvl - old_value + new_value_usd));
        
        env.events().publish(
            (Symbol::new(&env, "ValuationUpdated"),),
            (asset_id, old_value, new_value_usd),
        );
        
        true
    }
    
    /// Pause/unpause asset transfers
    pub fn set_asset_transferable(env: Env, asset_id: u64, transferable: bool) -> bool {
        let admin: Address = env.storage().persistent()
            .get(&RWAKey::Admin)
            .expect("Contract not initialized");
        admin.require_auth();
        
        let mut asset: RWAAsset = match env.storage().persistent().get(&RWAKey::Asset(asset_id)) {
            Some(a) => a,
            None => return false,
        };
        
        asset.is_transferable = transferable;
        env.storage().persistent().set(&RWAKey::Asset(asset_id), &asset);
        
        env.events().publish(
            (Symbol::new(&env, "TransferabilityChanged"),),
            (asset_id, transferable),
        );
        
        true
    }
    
    // ============== Investor Management ==============
    
    /// Register a new investor with KYC
    pub fn register_investor(
        env: Env,
        investor_address: Address,
        is_accredited: bool,
        country_code: String,
        kyc_expiry: u64,
    ) -> bool {
        let admin: Address = env.storage().persistent()
            .get(&RWAKey::Admin)
            .expect("Contract not initialized");
        admin.require_auth();
        
        // Check country whitelist
        let country_allowed: bool = env.storage().persistent()
            .get(&RWAKey::WhitelistedCountry(country_code.clone()))
            .unwrap_or(false);
        
        if !country_allowed {
            panic!("Country not whitelisted");
        }
        
        let investor = Investor {
            address: investor_address.clone(),
            is_accredited,
            is_kyc_verified: true,
            kyc_expiry,
            country_code: country_code.clone(),
            total_invested: 0,
            registered_at: env.ledger().timestamp(),
        };
        
        env.storage().persistent().set(&RWAKey::Investor(investor_address.clone()), &investor);
        
        env.events().publish(
            (Symbol::new(&env, "InvestorRegistered"),),
            (investor_address, is_accredited, country_code),
        );
        
        true
    }
    
    /// Update investor accreditation status
    pub fn update_accreditation(env: Env, investor_address: Address, is_accredited: bool) -> bool {
        let admin: Address = env.storage().persistent()
            .get(&RWAKey::Admin)
            .expect("Contract not initialized");
        admin.require_auth();
        
        let mut investor: Investor = match env.storage().persistent().get(&RWAKey::Investor(investor_address.clone())) {
            Some(i) => i,
            None => return false,
        };
        
        investor.is_accredited = is_accredited;
        env.storage().persistent().set(&RWAKey::Investor(investor_address.clone()), &investor);
        
        env.events().publish(
            (Symbol::new(&env, "AccreditationUpdated"),),
            (investor_address, is_accredited),
        );
        
        true
    }
    
    // ============== Investment Functions ==============
    
    /// Invest in an RWA asset (purchase tokens)
    pub fn invest(
        env: Env,
        asset_id: u64,
        investor_address: Address,
        amount: i128,
        payment_token: Address,
        payment_amount: i128,
    ) -> bool {
        investor_address.require_auth();
        
        // Check blacklist
        let is_blacklisted: bool = env.storage().persistent()
            .get(&RWAKey::BlacklistedAddress(investor_address.clone()))
            .unwrap_or(false);
        if is_blacklisted {
            panic!("Address is blacklisted");
        }
        
        // Get asset
        let mut asset: RWAAsset = match env.storage().persistent().get(&RWAKey::Asset(asset_id)) {
            Some(a) => a,
            None => panic!("Asset not found"),
        };
        
        if !asset.is_active {
            panic!("Asset is not active");
        }
        
        // Check minimum investment
        if amount < asset.min_investment {
            panic!("Below minimum investment");
        }
        
        // Check supply
        if asset.circulating_supply + amount > asset.total_supply {
            panic!("Exceeds total supply");
        }
        
        // Get investor and verify KYC
        let mut investor: Investor = match env.storage().persistent().get(&RWAKey::Investor(investor_address.clone())) {
            Some(i) => i,
            None => panic!("Investor not registered"),
        };
        
        if !investor.is_kyc_verified || investor.kyc_expiry < env.ledger().timestamp() {
            panic!("KYC verification required or expired");
        }
        
        // Check accreditation requirement
        if asset.accredited_only && !investor.is_accredited {
            panic!("Accredited investors only");
        }
        
        // Transfer payment
        let payment_client = token::Client::new(&env, &payment_token);
        payment_client.transfer(&investor_address, &asset.custodian, &payment_amount);
        
        // Get asset token and transfer to investor
        let asset_token: Address = env.storage().persistent()
            .get(&RWAKey::AssetToken(asset_id))
            .expect("Asset token not found");
        let asset_client = token::Client::new(&env, &asset_token);
        asset_client.transfer(&asset.issuer, &investor_address, &amount);
        
        // Update holding
        let existing_holding: Option<Holding> = env.storage().persistent()
            .get(&RWAKey::Holding(asset_id, investor_address.clone()));
        
        let price_per_token = payment_amount / amount;
        
        let holding = match existing_holding {
            Some(mut h) => {
                h.amount += amount;
                h.purchase_price = (h.purchase_price + price_per_token) / 2; // Average price
                h
            },
            None => Holding {
                asset_id,
                investor: investor_address.clone(),
                amount,
                purchase_price: price_per_token,
                acquired_at: env.ledger().timestamp(),
                locked_until: 0,
            }
        };
        
        env.storage().persistent().set(&RWAKey::Holding(asset_id, investor_address.clone()), &holding);
        
        // Update asset circulating supply
        asset.circulating_supply += amount;
        env.storage().persistent().set(&RWAKey::Asset(asset_id), &asset);
        
        // Update investor total
        investor.total_invested += payment_amount;
        env.storage().persistent().set(&RWAKey::Investor(investor_address.clone()), &investor);
        
        env.events().publish(
            (Symbol::new(&env, "Investment"),),
            (asset_id, investor_address, amount, payment_amount),
        );
        
        true
    }
    
    /// Transfer RWA tokens between investors (with compliance checks)
    pub fn transfer(
        env: Env,
        asset_id: u64,
        from: Address,
        to: Address,
        amount: i128,
    ) -> bool {
        from.require_auth();
        
        // Get asset
        let asset: RWAAsset = match env.storage().persistent().get(&RWAKey::Asset(asset_id)) {
            Some(a) => a,
            None => panic!("Asset not found"),
        };
        
        if !asset.is_active || !asset.is_transferable {
            panic!("Asset transfers disabled");
        }
        
        // Check blacklist for both parties
        let from_blacklisted: bool = env.storage().persistent()
            .get(&RWAKey::BlacklistedAddress(from.clone()))
            .unwrap_or(false);
        let to_blacklisted: bool = env.storage().persistent()
            .get(&RWAKey::BlacklistedAddress(to.clone()))
            .unwrap_or(false);
        
        if from_blacklisted || to_blacklisted {
            panic!("Address is blacklisted");
        }
        
        // Verify recipient KYC
        let to_investor: Investor = match env.storage().persistent().get(&RWAKey::Investor(to.clone())) {
            Some(i) => i,
            None => panic!("Recipient not registered"),
        };
        
        if !to_investor.is_kyc_verified || to_investor.kyc_expiry < env.ledger().timestamp() {
            panic!("Recipient KYC verification required");
        }
        
        // Check accreditation for recipient
        if asset.accredited_only && !to_investor.is_accredited {
            panic!("Recipient must be accredited");
        }
        
        // Check sender holding and lock-up
        let mut from_holding: Holding = match env.storage().persistent().get(&RWAKey::Holding(asset_id, from.clone())) {
            Some(h) => h,
            None => panic!("No holding found"),
        };
        
        if from_holding.amount < amount {
            panic!("Insufficient balance");
        }
        
        if from_holding.locked_until > env.ledger().timestamp() {
            panic!("Tokens are locked");
        }
        
        // Transfer tokens
        let asset_token: Address = env.storage().persistent()
            .get(&RWAKey::AssetToken(asset_id))
            .expect("Asset token not found");
        let asset_client = token::Client::new(&env, &asset_token);
        asset_client.transfer(&from, &to, &amount);
        
        // Update sender holding
        from_holding.amount -= amount;
        env.storage().persistent().set(&RWAKey::Holding(asset_id, from.clone()), &from_holding);
        
        // Update recipient holding
        let mut to_holding: Holding = env.storage().persistent()
            .get(&RWAKey::Holding(asset_id, to.clone()))
            .unwrap_or(Holding {
                asset_id,
                investor: to.clone(),
                amount: 0,
                purchase_price: 0,
                acquired_at: env.ledger().timestamp(),
                locked_until: 0,
            });
        
        to_holding.amount += amount;
        env.storage().persistent().set(&RWAKey::Holding(asset_id, to.clone()), &to_holding);
        
        env.events().publish(
            (Symbol::new(&env, "Transfer"),),
            (asset_id, from, to, amount),
        );
        
        true
    }
    
    // ============== Dividend Distribution ==============
    
    /// Create a dividend/yield distribution for asset holders
    pub fn create_distribution(
        env: Env,
        asset_id: u64,
        total_amount: i128,
        distribution_token: Address,
    ) -> u64 {
        let admin: Address = env.storage().persistent()
            .get(&RWAKey::Admin)
            .expect("Contract not initialized");
        admin.require_auth();
        
        let asset: RWAAsset = match env.storage().persistent().get(&RWAKey::Asset(asset_id)) {
            Some(a) => a,
            None => panic!("Asset not found"),
        };
        
        if asset.circulating_supply == 0 {
            panic!("No tokens in circulation");
        }
        
        // Transfer distribution tokens to contract
        let client = token::Client::new(&env, &distribution_token);
        client.transfer(&admin, &env.current_contract_address(), &total_amount);
        
        // Calculate per-token amount
        let per_token_amount = total_amount / asset.circulating_supply;
        
        // Get next distribution ID
        let distribution_id: u64 = env.storage().persistent()
            .get(&RWAKey::DistributionCounter)
            .unwrap_or(0) + 1;
        
        let distribution = Distribution {
            distribution_id,
            asset_id,
            total_amount,
            per_token_amount,
            distribution_token: distribution_token.clone(),
            snapshot_time: env.ledger().timestamp(),
            created_at: env.ledger().timestamp(),
            is_claimed: false,
        };
        
        env.storage().persistent().set(&RWAKey::Distribution(distribution_id), &distribution);
        env.storage().persistent().set(&RWAKey::DistributionCounter, &distribution_id);
        
        env.events().publish(
            (Symbol::new(&env, "DistributionCreated"),),
            (distribution_id, asset_id, total_amount, per_token_amount),
        );
        
        distribution_id
    }
    
    /// Claim dividend from a distribution
    pub fn claim_distribution(
        env: Env,
        distribution_id: u64,
        investor_address: Address,
    ) -> i128 {
        investor_address.require_auth();
        
        // Check if already claimed
        let already_claimed: bool = env.storage().persistent()
            .get(&RWAKey::ClaimedDistribution(distribution_id, investor_address.clone()))
            .unwrap_or(false);
        
        if already_claimed {
            panic!("Already claimed");
        }
        
        // Get distribution
        let distribution: Distribution = match env.storage().persistent().get(&RWAKey::Distribution(distribution_id)) {
            Some(d) => d,
            None => panic!("Distribution not found"),
        };
        
        // Get investor holding
        let holding: Holding = match env.storage().persistent().get(&RWAKey::Holding(distribution.asset_id, investor_address.clone())) {
            Some(h) => h,
            None => panic!("No holding found"),
        };
        
        // Holding must have been acquired before snapshot
        if holding.acquired_at > distribution.snapshot_time {
            panic!("Holding acquired after snapshot");
        }
        
        // Calculate claim amount
        let claim_amount = holding.amount * distribution.per_token_amount;
        
        if claim_amount <= 0 {
            panic!("Nothing to claim");
        }
        
        // Transfer distribution tokens
        let client = token::Client::new(&env, &distribution.distribution_token);
        client.transfer(&env.current_contract_address(), &investor_address, &claim_amount);
        
        // Mark as claimed
        env.storage().persistent().set(&RWAKey::ClaimedDistribution(distribution_id, investor_address.clone()), &true);
        
        env.events().publish(
            (Symbol::new(&env, "DistributionClaimed"),),
            (distribution_id, investor_address, claim_amount),
        );
        
        claim_amount
    }
    
    // ============== View Functions ==============
    
    /// Get asset details
    pub fn get_asset(env: Env, asset_id: u64) -> Option<RWAAsset> {
        env.storage().persistent().get(&RWAKey::Asset(asset_id))
    }
    
    /// Get investor details
    pub fn get_investor(env: Env, investor_address: Address) -> Option<Investor> {
        env.storage().persistent().get(&RWAKey::Investor(investor_address))
    }
    
    /// Get holding details
    pub fn get_holding(env: Env, asset_id: u64, investor_address: Address) -> Option<Holding> {
        env.storage().persistent().get(&RWAKey::Holding(asset_id, investor_address))
    }
    
    /// Get distribution details
    pub fn get_distribution(env: Env, distribution_id: u64) -> Option<Distribution> {
        env.storage().persistent().get(&RWAKey::Distribution(distribution_id))
    }
    
    /// Check if distribution is claimed
    pub fn is_distribution_claimed(env: Env, distribution_id: u64, investor_address: Address) -> bool {
        env.storage().persistent()
            .get(&RWAKey::ClaimedDistribution(distribution_id, investor_address))
            .unwrap_or(false)
    }
    
    /// Get total value locked
    pub fn get_tvl(env: Env) -> i128 {
        env.storage().persistent()
            .get(&RWAKey::TotalValueLocked)
            .unwrap_or(0)
    }
    
    /// Get total assets count
    pub fn get_asset_count(env: Env) -> u64 {
        env.storage().persistent()
            .get(&RWAKey::AssetCounter)
            .unwrap_or(0)
    }
    
    /// Check if investor is eligible for an asset
    pub fn check_eligibility(env: Env, asset_id: u64, investor_address: Address) -> bool {
        // Check blacklist
        let is_blacklisted: bool = env.storage().persistent()
            .get(&RWAKey::BlacklistedAddress(investor_address.clone()))
            .unwrap_or(false);
        if is_blacklisted {
            return false;
        }
        
        // Get asset
        let asset: RWAAsset = match env.storage().persistent().get(&RWAKey::Asset(asset_id)) {
            Some(a) => a,
            None => return false,
        };
        
        if !asset.is_active {
            return false;
        }
        
        // Get investor
        let investor: Investor = match env.storage().persistent().get(&RWAKey::Investor(investor_address)) {
            Some(i) => i,
            None => return false,
        };
        
        // Check KYC
        if !investor.is_kyc_verified || investor.kyc_expiry < env.ledger().timestamp() {
            return false;
        }
        
        // Check accreditation
        if asset.accredited_only && !investor.is_accredited {
            return false;
        }
        
        true
    }
    
    /// Calculate price per token for an asset
    pub fn get_token_price(env: Env, asset_id: u64) -> i128 {
        let asset: RWAAsset = match env.storage().persistent().get(&RWAKey::Asset(asset_id)) {
            Some(a) => a,
            None => return 0,
        };
        
        if asset.total_supply == 0 {
            return 0;
        }
        
        asset.asset_value_usd / asset.total_supply
    }
}

// ============== Tests ==============

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::{Address as _, Ledger};
    
    #[test]
    fn test_initialize() {
        let env = Env::default();
        let contract_id = env.register_contract(None, RWAContract);
        let client = RWAContractClient::new(&env, &contract_id);
        
        let admin = Address::generate(&env);
        
        env.mock_all_auths();
        client.initialize(&admin);
        
        assert_eq!(client.get_asset_count(), 0);
        assert_eq!(client.get_tvl(), 0);
    }
}
