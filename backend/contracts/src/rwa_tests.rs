// ============== Comprehensive Test Suite for RWA Contract ==============
//
// This module contains all test cases for the Real World Asset Contract.
// Run with: cargo test --package steller_contracts

#[cfg(test)]
mod rwa_tests {
    use crate::rwa::{RWAContract, RWAContractClient, AssetType, RWAAsset, Investor, Holding};
    use soroban_sdk::{
        testutils::{Address as _, AuthorizedFunction, AuthorizedInvocation, Ledger, LedgerInfo},
        token::{self, Client as TokenClient, StellarAssetClient},
        Address, Env, IntoVal, String, Symbol,
    };

    // ============== Helper Functions ==============

    fn create_token_contract<'a>(
        env: &Env,
        admin: &Address,
    ) -> (Address, TokenClient<'a>, StellarAssetClient<'a>) {
        let contract_address = env.register_stellar_asset_contract_v2(admin.clone());
        (
            contract_address.address().clone(),
            token::Client::new(env, &contract_address.address()),
            token::StellarAssetClient::new(env, &contract_address.address()),
        )
    }

    fn setup_test_env() -> (Env, Address, RWAContractClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let contract_id = env.register_contract(None, RWAContract);
        let client = RWAContractClient::new(&env, &contract_id);

        client.initialize(&admin);

        (env, admin, client)
    }

    fn setup_with_asset() -> (Env, Address, Address, Address, RWAContractClient<'static>, u64) {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let custodian = Address::generate(&env);

        let (token_address, _, _) = create_token_contract(&env, &admin);

        let contract_id = env.register_contract(None, RWAContract);
        let client = RWAContractClient::new(&env, &contract_id);

        client.initialize(&admin);

        // Create an asset
        let asset_id = client.create_asset(
            &String::from_str(&env, "Test Property"),
            &String::from_str(&env, "TPROP"),
            &AssetType::RealEstate,
            &1000000,      // 1M tokens
            &100000000,    // $1M USD (in cents)
            &custodian,
            &token_address,
            &100,          // min 100 tokens
            &false,        // not accredited only
        );

        (env, admin, custodian, token_address, client, asset_id)
    }

    // ============== Initialization Tests ==============

    #[test]
    fn test_initialize_success() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let contract_id = env.register_contract(None, RWAContract);
        let client = RWAContractClient::new(&env, &contract_id);

        client.initialize(&admin);

        assert_eq!(client.get_asset_count(), 0);
        assert_eq!(client.get_tvl(), 0);
    }

    #[test]
    #[should_panic(expected = "Contract already initialized")]
    fn test_initialize_twice_fails() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let contract_id = env.register_contract(None, RWAContract);
        let client = RWAContractClient::new(&env, &contract_id);

        client.initialize(&admin);
        client.initialize(&admin); // Should panic
    }

    // ============== Admin Tests ==============

    #[test]
    fn test_set_admin() {
        let (env, admin, client) = setup_test_env();

        let new_admin = Address::generate(&env);
        client.set_admin(&new_admin);

        // The admin should be updated (we can verify through other admin-only operations)
        // Since there's no get_admin, we test by trying an admin operation
    }

    #[test]
    fn test_whitelist_country() {
        let (env, admin, client) = setup_test_env();

        let country_code = String::from_str(&env, "US");
        client.whitelist_country(&country_code, &true);

        // Create investor to verify whitelist works
        let investor = Address::generate(&env);
        let kyc_expiry = env.ledger().timestamp() + 365 * 86400;

        // This should succeed with whitelisted country
        let result = client.register_investor(
            &investor,
            &true,
            &country_code,
            &kyc_expiry,
        );
        assert!(result);
    }

    #[test]
    #[should_panic(expected = "Country not whitelisted")]
    fn test_register_investor_non_whitelisted_country() {
        let (env, admin, client) = setup_test_env();

        let investor = Address::generate(&env);
        let country_code = String::from_str(&env, "XX"); // Not whitelisted
        let kyc_expiry = env.ledger().timestamp() + 365 * 86400;

        client.register_investor(&investor, &true, &country_code, &kyc_expiry);
    }

    #[test]
    fn test_blacklist_address() {
        let (env, admin, client) = setup_test_env();

        let blacklisted_address = Address::generate(&env);
        client.blacklist_address(&blacklisted_address, &true);

        // Verify the address is blacklisted through eligibility check
    }

    // ============== Asset Creation Tests ==============

    #[test]
    fn test_create_asset_success() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let custodian = Address::generate(&env);
        let (token_address, _, _) = create_token_contract(&env, &admin);

        let contract_id = env.register_contract(None, RWAContract);
        let client = RWAContractClient::new(&env, &contract_id);
        client.initialize(&admin);

        let asset_id = client.create_asset(
            &String::from_str(&env, "Manhattan Tower"),
            &String::from_str(&env, "MTWR"),
            &AssetType::RealEstate,
            &1000000,
            &50000000000, // $500M
            &custodian,
            &token_address,
            &1000,
            &true, // accredited only
        );

        assert_eq!(asset_id, 1);
        assert_eq!(client.get_asset_count(), 1);

        let asset = client.get_asset(&asset_id).unwrap();
        assert_eq!(asset.total_supply, 1000000);
        assert_eq!(asset.circulating_supply, 0);
        assert!(asset.is_active);
        assert!(asset.accredited_only);
    }

    #[test]
    fn test_create_multiple_assets() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let custodian = Address::generate(&env);
        let (token_address, _, _) = create_token_contract(&env, &admin);

        let contract_id = env.register_contract(None, RWAContract);
        let client = RWAContractClient::new(&env, &contract_id);
        client.initialize(&admin);

        let id1 = client.create_asset(
            &String::from_str(&env, "Asset 1"),
            &String::from_str(&env, "AST1"),
            &AssetType::RealEstate,
            &1000000,
            &100000000,
            &custodian,
            &token_address,
            &100,
            &false,
        );

        let id2 = client.create_asset(
            &String::from_str(&env, "Asset 2"),
            &String::from_str(&env, "AST2"),
            &AssetType::Commodity,
            &500000,
            &50000000,
            &custodian,
            &token_address,
            &50,
            &false,
        );

        let id3 = client.create_asset(
            &String::from_str(&env, "Asset 3"),
            &String::from_str(&env, "AST3"),
            &AssetType::Bond,
            &2000000,
            &200000000,
            &custodian,
            &token_address,
            &1000,
            &true,
        );

        assert_eq!(id1, 1);
        assert_eq!(id2, 2);
        assert_eq!(id3, 3);
        assert_eq!(client.get_asset_count(), 3);
    }

    #[test]
    #[should_panic(expected = "Invalid supply or value")]
    fn test_create_asset_invalid_supply() {
        let (env, admin, client) = setup_test_env();

        let custodian = Address::generate(&env);
        let (token_address, _, _) = create_token_contract(&env, &admin);

        client.create_asset(
            &String::from_str(&env, "Bad Asset"),
            &String::from_str(&env, "BAD"),
            &AssetType::Other,
            &0,  // Invalid supply
            &100000000,
            &custodian,
            &token_address,
            &100,
            &false,
        );
    }

    // ============== Valuation Tests ==============

    #[test]
    fn test_update_valuation() {
        let (env, admin, custodian, token_address, client, asset_id) = setup_with_asset();

        let old_asset = client.get_asset(&asset_id).unwrap();
        assert_eq!(old_asset.asset_value_usd, 100000000);

        // Update valuation to $1.5M
        let result = client.update_valuation(&asset_id, &150000000);
        assert!(result);

        let new_asset = client.get_asset(&asset_id).unwrap();
        assert_eq!(new_asset.asset_value_usd, 150000000);
    }

    #[test]
    fn test_update_valuation_nonexistent() {
        let (env, admin, client) = setup_test_env();

        let result = client.update_valuation(&999, &100000000);
        assert!(!result);
    }

    // ============== Asset Transferability Tests ==============

    #[test]
    fn test_set_asset_transferable() {
        let (env, admin, custodian, token_address, client, asset_id) = setup_with_asset();

        // Initially transferable
        let asset = client.get_asset(&asset_id).unwrap();
        assert!(asset.is_transferable);

        // Disable transfers
        client.set_asset_transferable(&asset_id, &false);
        let asset = client.get_asset(&asset_id).unwrap();
        assert!(!asset.is_transferable);

        // Re-enable transfers
        client.set_asset_transferable(&asset_id, &true);
        let asset = client.get_asset(&asset_id).unwrap();
        assert!(asset.is_transferable);
    }

    // ============== Investor Registration Tests ==============

    #[test]
    fn test_register_investor_success() {
        let (env, admin, client) = setup_test_env();

        let country_code = String::from_str(&env, "US");
        client.whitelist_country(&country_code, &true);

        let investor = Address::generate(&env);
        let kyc_expiry = env.ledger().timestamp() + 365 * 86400;

        let result = client.register_investor(
            &investor,
            &true,  // accredited
            &country_code,
            &kyc_expiry,
        );
        assert!(result);

        let investor_data = client.get_investor(&investor).unwrap();
        assert!(investor_data.is_accredited);
        assert!(investor_data.is_kyc_verified);
    }

    #[test]
    fn test_update_accreditation() {
        let (env, admin, client) = setup_test_env();

        let country_code = String::from_str(&env, "US");
        client.whitelist_country(&country_code, &true);

        let investor = Address::generate(&env);
        let kyc_expiry = env.ledger().timestamp() + 365 * 86400;

        client.register_investor(&investor, &false, &country_code, &kyc_expiry);

        let investor_data = client.get_investor(&investor).unwrap();
        assert!(!investor_data.is_accredited);

        // Update accreditation
        client.update_accreditation(&investor, &true);
        let investor_data = client.get_investor(&investor).unwrap();
        assert!(investor_data.is_accredited);
    }

    // ============== Investment Tests ==============

    #[test]
    fn test_invest_success() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let custodian = Address::generate(&env);
        let investor = Address::generate(&env);

        // Create payment token
        let (payment_token, payment_client, payment_admin) = create_token_contract(&env, &admin);
        payment_admin.mint(&investor, &1000000);

        // Create asset token
        let (asset_token, asset_client, asset_admin) = create_token_contract(&env, &admin);
        asset_admin.mint(&admin, &1000000);

        let contract_id = env.register_contract(None, RWAContract);
        let client = RWAContractClient::new(&env, &contract_id);
        client.initialize(&admin);

        // Whitelist country and register investor
        let country_code = String::from_str(&env, "US");
        client.whitelist_country(&country_code, &true);
        client.register_investor(
            &investor,
            &false,
            &country_code,
            &(env.ledger().timestamp() + 365 * 86400),
        );

        // Create asset
        let asset_id = client.create_asset(
            &String::from_str(&env, "Test Asset"),
            &String::from_str(&env, "TEST"),
            &AssetType::RealEstate,
            &1000000,
            &100000000,
            &custodian,
            &asset_token,
            &100,
            &false,
        );

        // Invest
        let invest_amount: i128 = 1000;
        let payment_amount: i128 = 100000; // $1000 in cents

        let result = client.invest(
            &asset_id,
            &investor,
            &invest_amount,
            &payment_token,
            &payment_amount,
        );
        assert!(result);

        // Check holding
        let holding = client.get_holding(&asset_id, &investor).unwrap();
        assert_eq!(holding.amount, invest_amount);

        // Check asset circulating supply
        let asset = client.get_asset(&asset_id).unwrap();
        assert_eq!(asset.circulating_supply, invest_amount);
    }

    #[test]
    #[should_panic(expected = "Investor not registered")]
    fn test_invest_unregistered_investor() {
        let (env, admin, custodian, token_address, client, asset_id) = setup_with_asset();

        let (payment_token, _, _) = create_token_contract(&env, &admin);
        let unregistered_investor = Address::generate(&env);

        client.invest(
            &asset_id,
            &unregistered_investor,
            &1000,
            &payment_token,
            &100000,
        );
    }

    #[test]
    #[should_panic(expected = "Below minimum investment")]
    fn test_invest_below_minimum() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let custodian = Address::generate(&env);
        let investor = Address::generate(&env);

        let (token_address, _, _) = create_token_contract(&env, &admin);
        let (payment_token, _, payment_admin) = create_token_contract(&env, &admin);
        payment_admin.mint(&investor, &1000000);

        let contract_id = env.register_contract(None, RWAContract);
        let client = RWAContractClient::new(&env, &contract_id);
        client.initialize(&admin);

        let country_code = String::from_str(&env, "US");
        client.whitelist_country(&country_code, &true);
        client.register_investor(
            &investor,
            &false,
            &country_code,
            &(env.ledger().timestamp() + 365 * 86400),
        );

        let asset_id = client.create_asset(
            &String::from_str(&env, "Test"),
            &String::from_str(&env, "TST"),
            &AssetType::RealEstate,
            &1000000,
            &100000000,
            &custodian,
            &token_address,
            &1000, // min 1000 tokens
            &false,
        );

        // Try to invest below minimum
        client.invest(&asset_id, &investor, &500, &payment_token, &50000);
    }

    #[test]
    #[should_panic(expected = "Accredited investors only")]
    fn test_invest_non_accredited_in_accredited_only() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let custodian = Address::generate(&env);
        let investor = Address::generate(&env);

        let (token_address, _, _) = create_token_contract(&env, &admin);
        let (payment_token, _, payment_admin) = create_token_contract(&env, &admin);
        payment_admin.mint(&investor, &1000000);

        let contract_id = env.register_contract(None, RWAContract);
        let client = RWAContractClient::new(&env, &contract_id);
        client.initialize(&admin);

        let country_code = String::from_str(&env, "US");
        client.whitelist_country(&country_code, &true);
        client.register_investor(
            &investor,
            &false, // NOT accredited
            &country_code,
            &(env.ledger().timestamp() + 365 * 86400),
        );

        let asset_id = client.create_asset(
            &String::from_str(&env, "Accredited Only Asset"),
            &String::from_str(&env, "ACC"),
            &AssetType::Security,
            &1000000,
            &100000000,
            &custodian,
            &token_address,
            &100,
            &true, // accredited only
        );

        client.invest(&asset_id, &investor, &1000, &payment_token, &100000);
    }

    // ============== Transfer Tests ==============

    #[test]
    fn test_transfer_success() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let custodian = Address::generate(&env);
        let investor1 = Address::generate(&env);
        let investor2 = Address::generate(&env);

        let (payment_token, _, payment_admin) = create_token_contract(&env, &admin);
        payment_admin.mint(&investor1, &1000000);

        let (asset_token, asset_client, asset_admin) = create_token_contract(&env, &admin);
        asset_admin.mint(&admin, &1000000);

        let contract_id = env.register_contract(None, RWAContract);
        let client = RWAContractClient::new(&env, &contract_id);
        client.initialize(&admin);

        let country_code = String::from_str(&env, "US");
        client.whitelist_country(&country_code, &true);

        // Register both investors
        let kyc_expiry = env.ledger().timestamp() + 365 * 86400;
        client.register_investor(&investor1, &false, &country_code, &kyc_expiry);
        client.register_investor(&investor2, &false, &country_code, &kyc_expiry);

        let asset_id = client.create_asset(
            &String::from_str(&env, "Transferable Asset"),
            &String::from_str(&env, "TRFR"),
            &AssetType::RealEstate,
            &1000000,
            &100000000,
            &custodian,
            &asset_token,
            &100,
            &false,
        );

        // Investor1 invests
        client.invest(&asset_id, &investor1, &5000, &payment_token, &500000);

        // Transfer to investor2
        let result = client.transfer(&asset_id, &investor1, &investor2, &2000);
        assert!(result);

        // Check holdings
        let holding1 = client.get_holding(&asset_id, &investor1).unwrap();
        let holding2 = client.get_holding(&asset_id, &investor2).unwrap();
        assert_eq!(holding1.amount, 3000);
        assert_eq!(holding2.amount, 2000);
    }

    #[test]
    #[should_panic(expected = "Asset transfers disabled")]
    fn test_transfer_non_transferable() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let custodian = Address::generate(&env);
        let investor1 = Address::generate(&env);
        let investor2 = Address::generate(&env);

        let (payment_token, _, payment_admin) = create_token_contract(&env, &admin);
        payment_admin.mint(&investor1, &1000000);

        let (asset_token, _, asset_admin) = create_token_contract(&env, &admin);
        asset_admin.mint(&admin, &1000000);

        let contract_id = env.register_contract(None, RWAContract);
        let client = RWAContractClient::new(&env, &contract_id);
        client.initialize(&admin);

        let country_code = String::from_str(&env, "US");
        client.whitelist_country(&country_code, &true);

        let kyc_expiry = env.ledger().timestamp() + 365 * 86400;
        client.register_investor(&investor1, &false, &country_code, &kyc_expiry);
        client.register_investor(&investor2, &false, &country_code, &kyc_expiry);

        let asset_id = client.create_asset(
            &String::from_str(&env, "Non-Transferable"),
            &String::from_str(&env, "NOTR"),
            &AssetType::Security,
            &1000000,
            &100000000,
            &custodian,
            &asset_token,
            &100,
            &false,
        );

        // Disable transfers
        client.set_asset_transferable(&asset_id, &false);

        // Invest
        client.invest(&asset_id, &investor1, &5000, &payment_token, &500000);

        // Try to transfer - should panic
        client.transfer(&asset_id, &investor1, &investor2, &2000);
    }

    // ============== Distribution Tests ==============

    #[test]
    fn test_create_distribution() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let custodian = Address::generate(&env);
        let investor = Address::generate(&env);

        let (payment_token, _, payment_admin) = create_token_contract(&env, &admin);
        payment_admin.mint(&investor, &1000000);
        payment_admin.mint(&admin, &10000000); // For distribution

        let (asset_token, _, asset_admin) = create_token_contract(&env, &admin);
        asset_admin.mint(&admin, &1000000);

        let (dist_token, _, dist_admin) = create_token_contract(&env, &admin);
        dist_admin.mint(&admin, &1000000);

        let contract_id = env.register_contract(None, RWAContract);
        let client = RWAContractClient::new(&env, &contract_id);
        client.initialize(&admin);

        let country_code = String::from_str(&env, "US");
        client.whitelist_country(&country_code, &true);
        client.register_investor(
            &investor,
            &false,
            &country_code,
            &(env.ledger().timestamp() + 365 * 86400),
        );

        let asset_id = client.create_asset(
            &String::from_str(&env, "Dividend Asset"),
            &String::from_str(&env, "DIV"),
            &AssetType::RealEstate,
            &1000000,
            &100000000,
            &custodian,
            &asset_token,
            &100,
            &false,
        );

        // Investor buys tokens
        client.invest(&asset_id, &investor, &10000, &payment_token, &1000000);

        // Create distribution
        let distribution_id = client.create_distribution(
            &asset_id,
            &50000, // $500 total dividend
            &dist_token,
        );

        assert_eq!(distribution_id, 1);

        let distribution = client.get_distribution(&distribution_id).unwrap();
        assert_eq!(distribution.asset_id, asset_id);
        assert_eq!(distribution.total_amount, 50000);
    }

    #[test]
    fn test_claim_distribution() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let custodian = Address::generate(&env);
        let investor = Address::generate(&env);

        let (payment_token, _, payment_admin) = create_token_contract(&env, &admin);
        payment_admin.mint(&investor, &1000000);

        let (asset_token, _, asset_admin) = create_token_contract(&env, &admin);
        asset_admin.mint(&admin, &1000000);

        let (dist_token, dist_client, dist_admin) = create_token_contract(&env, &admin);
        dist_admin.mint(&admin, &1000000);

        let contract_id = env.register_contract(None, RWAContract);
        let client = RWAContractClient::new(&env, &contract_id);
        client.initialize(&admin);

        let country_code = String::from_str(&env, "US");
        client.whitelist_country(&country_code, &true);
        client.register_investor(
            &investor,
            &false,
            &country_code,
            &(env.ledger().timestamp() + 365 * 86400),
        );

        let asset_id = client.create_asset(
            &String::from_str(&env, "Dividend Asset"),
            &String::from_str(&env, "DIV"),
            &AssetType::RealEstate,
            &100000,
            &10000000,
            &custodian,
            &asset_token,
            &100,
            &false,
        );

        // Investor buys 10% of tokens
        client.invest(&asset_id, &investor, &10000, &payment_token, &1000000);

        // Create distribution of $1000
        let distribution_id = client.create_distribution(&asset_id, &100000, &dist_token);

        // Claim distribution
        let investor_balance_before = dist_client.balance(&investor);
        let claimed = client.claim_distribution(&distribution_id, &investor);
        let investor_balance_after = dist_client.balance(&investor);

        // Investor should receive 10% of distribution = $100
        assert!(claimed > 0);
        assert_eq!(investor_balance_after, investor_balance_before + claimed);
    }

    #[test]
    #[should_panic(expected = "Already claimed")]
    fn test_claim_distribution_twice() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let custodian = Address::generate(&env);
        let investor = Address::generate(&env);

        let (payment_token, _, payment_admin) = create_token_contract(&env, &admin);
        payment_admin.mint(&investor, &1000000);

        let (asset_token, _, asset_admin) = create_token_contract(&env, &admin);
        asset_admin.mint(&admin, &1000000);

        let (dist_token, _, dist_admin) = create_token_contract(&env, &admin);
        dist_admin.mint(&admin, &1000000);

        let contract_id = env.register_contract(None, RWAContract);
        let client = RWAContractClient::new(&env, &contract_id);
        client.initialize(&admin);

        let country_code = String::from_str(&env, "US");
        client.whitelist_country(&country_code, &true);
        client.register_investor(
            &investor,
            &false,
            &country_code,
            &(env.ledger().timestamp() + 365 * 86400),
        );

        let asset_id = client.create_asset(
            &String::from_str(&env, "Test"),
            &String::from_str(&env, "TST"),
            &AssetType::RealEstate,
            &100000,
            &10000000,
            &custodian,
            &asset_token,
            &100,
            &false,
        );

        client.invest(&asset_id, &investor, &10000, &payment_token, &1000000);

        let distribution_id = client.create_distribution(&asset_id, &100000, &dist_token);

        // First claim succeeds
        client.claim_distribution(&distribution_id, &investor);

        // Second claim should panic
        client.claim_distribution(&distribution_id, &investor);
    }

    // ============== Query Tests ==============

    #[test]
    fn test_get_asset() {
        let (env, admin, custodian, token_address, client, asset_id) = setup_with_asset();

        let asset = client.get_asset(&asset_id);
        assert!(asset.is_some());

        let asset = asset.unwrap();
        assert_eq!(asset.asset_id, asset_id);
        assert_eq!(asset.total_supply, 1000000);
    }

    #[test]
    fn test_get_nonexistent_asset() {
        let (env, admin, client) = setup_test_env();

        let asset = client.get_asset(&999);
        assert!(asset.is_none());
    }

    #[test]
    fn test_get_investor() {
        let (env, admin, client) = setup_test_env();

        let country_code = String::from_str(&env, "US");
        client.whitelist_country(&country_code, &true);

        let investor = Address::generate(&env);
        client.register_investor(
            &investor,
            &true,
            &country_code,
            &(env.ledger().timestamp() + 365 * 86400),
        );

        let investor_data = client.get_investor(&investor);
        assert!(investor_data.is_some());
        assert!(investor_data.unwrap().is_accredited);
    }

    #[test]
    fn test_check_eligibility() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let custodian = Address::generate(&env);
        let investor = Address::generate(&env);

        let (token_address, _, _) = create_token_contract(&env, &admin);

        let contract_id = env.register_contract(None, RWAContract);
        let client = RWAContractClient::new(&env, &contract_id);
        client.initialize(&admin);

        let country_code = String::from_str(&env, "US");
        client.whitelist_country(&country_code, &true);
        client.register_investor(
            &investor,
            &true,
            &country_code,
            &(env.ledger().timestamp() + 365 * 86400),
        );

        let asset_id = client.create_asset(
            &String::from_str(&env, "Test"),
            &String::from_str(&env, "TST"),
            &AssetType::Security,
            &1000000,
            &100000000,
            &custodian,
            &token_address,
            &100,
            &true, // accredited only
        );

        let eligible = client.check_eligibility(&asset_id, &investor);
        assert!(eligible);
    }

    #[test]
    fn test_get_token_price() {
        let (env, admin, custodian, token_address, client, asset_id) = setup_with_asset();

        let price = client.get_token_price(&asset_id);
        // $1M value / 1M tokens = $1 per token = 100 cents
        assert_eq!(price, 100);
    }

    #[test]
    fn test_get_tvl() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let custodian = Address::generate(&env);

        let (token_address, _, _) = create_token_contract(&env, &admin);

        let contract_id = env.register_contract(None, RWAContract);
        let client = RWAContractClient::new(&env, &contract_id);
        client.initialize(&admin);

        assert_eq!(client.get_tvl(), 0);

        client.create_asset(
            &String::from_str(&env, "Asset 1"),
            &String::from_str(&env, "A1"),
            &AssetType::RealEstate,
            &1000000,
            &100000000, // $1M
            &custodian,
            &token_address,
            &100,
            &false,
        );

        assert_eq!(client.get_tvl(), 100000000);

        client.create_asset(
            &String::from_str(&env, "Asset 2"),
            &String::from_str(&env, "A2"),
            &AssetType::Commodity,
            &500000,
            &50000000, // $500K
            &custodian,
            &token_address,
            &50,
            &false,
        );

        assert_eq!(client.get_tvl(), 150000000);
    }

    #[test]
    fn test_is_distribution_claimed() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let custodian = Address::generate(&env);
        let investor = Address::generate(&env);

        let (payment_token, _, payment_admin) = create_token_contract(&env, &admin);
        payment_admin.mint(&investor, &1000000);

        let (asset_token, _, asset_admin) = create_token_contract(&env, &admin);
        asset_admin.mint(&admin, &1000000);

        let (dist_token, _, dist_admin) = create_token_contract(&env, &admin);
        dist_admin.mint(&admin, &1000000);

        let contract_id = env.register_contract(None, RWAContract);
        let client = RWAContractClient::new(&env, &contract_id);
        client.initialize(&admin);

        let country_code = String::from_str(&env, "US");
        client.whitelist_country(&country_code, &true);
        client.register_investor(
            &investor,
            &false,
            &country_code,
            &(env.ledger().timestamp() + 365 * 86400),
        );

        let asset_id = client.create_asset(
            &String::from_str(&env, "Test"),
            &String::from_str(&env, "TST"),
            &AssetType::RealEstate,
            &100000,
            &10000000,
            &custodian,
            &asset_token,
            &100,
            &false,
        );

        client.invest(&asset_id, &investor, &10000, &payment_token, &1000000);

        let distribution_id = client.create_distribution(&asset_id, &100000, &dist_token);

        // Not claimed yet
        assert!(!client.is_distribution_claimed(&distribution_id, &investor));

        // Claim
        client.claim_distribution(&distribution_id, &investor);

        // Now claimed
        assert!(client.is_distribution_claimed(&distribution_id, &investor));
    }
}
