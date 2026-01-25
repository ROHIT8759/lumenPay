// ============== Comprehensive Test Suite for Escrow Contract ==============
//
// This module contains all test cases for the Escrow Contract functionality.
// Run with: cargo test --package steller_contracts

#[cfg(test)]
mod escrow_tests {
    use crate::escrow::{EscrowContract, EscrowContractClient, EscrowData};
    use soroban_sdk::{
        testutils::{Address as _, AuthorizedFunction, AuthorizedInvocation, Ledger, LedgerInfo},
        token::{self, Client as TokenClient, StellarAssetClient},
        Address, Env, IntoVal, Symbol,
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

    fn setup_test_env() -> (Env, Address, Address, Address, EscrowContractClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let borrower = Address::generate(&env);
        let lender = Address::generate(&env);

        let contract_id = env.register_contract(None, EscrowContract);
        let client = EscrowContractClient::new(&env, &contract_id);

        client.initialize(&admin);

        (env, admin, borrower, lender, client)
    }

    // ============== Initialization Tests ==============

    #[test]
    fn test_initialize_success() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let contract_id = env.register_contract(None, EscrowContract);
        let client = EscrowContractClient::new(&env, &contract_id);

        client.initialize(&admin);

        assert_eq!(client.get_admin(), admin);
        assert_eq!(client.get_total_locked(), 0);
    }

    #[test]
    #[should_panic(expected = "Contract already initialized")]
    fn test_initialize_twice_fails() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let contract_id = env.register_contract(None, EscrowContract);
        let client = EscrowContractClient::new(&env, &contract_id);

        client.initialize(&admin);
        // Second initialization should panic
        client.initialize(&admin);
    }

    // ============== Admin Tests ==============

    #[test]
    fn test_update_admin() {
        let (env, admin, _, _, client) = setup_test_env();

        let new_admin = Address::generate(&env);
        client.update_admin(&new_admin);

        assert_eq!(client.get_admin(), new_admin);
    }

    #[test]
    fn test_get_admin() {
        let (_env, admin, _, _, client) = setup_test_env();
        assert_eq!(client.get_admin(), admin);
    }

    // ============== Lock Collateral Tests ==============

    #[test]
    fn test_lock_collateral_success() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let borrower = Address::generate(&env);
        let lender = Address::generate(&env);

        // Create token
        let (token_address, token_client, token_admin) = create_token_contract(&env, &admin);

        // Mint tokens to borrower
        token_admin.mint(&borrower, &10000);

        // Setup escrow contract
        let contract_id = env.register_contract(None, EscrowContract);
        let client = EscrowContractClient::new(&env, &contract_id);
        client.initialize(&admin);

        // Lock collateral
        let loan_id: u64 = 1;
        let collateral_amount: i128 = 5000;
        let loan_amount: i128 = 3000;
        let duration: u64 = 86400 * 30; // 30 days

        let result = client.lock_collateral(
            &loan_id,
            &borrower,
            &lender,
            &token_address,
            &collateral_amount,
            &loan_amount,
            &duration,
        );

        assert!(result);
        assert_eq!(client.get_total_locked(), collateral_amount);

        // Check escrow data
        let escrow = client.get_escrow(&loan_id).unwrap();
        assert_eq!(escrow.borrower, borrower);
        assert_eq!(escrow.lender, lender);
        assert_eq!(escrow.collateral_amount, collateral_amount);
        assert_eq!(escrow.loan_amount, loan_amount);
        assert!(escrow.is_locked);
        assert!(!escrow.is_liquidated);
    }

    #[test]
    fn test_lock_collateral_invalid_amount() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let borrower = Address::generate(&env);
        let lender = Address::generate(&env);

        let (token_address, _, _) = create_token_contract(&env, &admin);

        let contract_id = env.register_contract(None, EscrowContract);
        let client = EscrowContractClient::new(&env, &contract_id);
        client.initialize(&admin);

        // Try to lock with zero collateral
        let result = client.lock_collateral(
            &1,
            &borrower,
            &lender,
            &token_address,
            &0, // Invalid amount
            &1000,
            &86400,
        );

        assert!(!result);
    }

    #[test]
    fn test_lock_collateral_duplicate_loan_id() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let borrower = Address::generate(&env);
        let lender = Address::generate(&env);

        let (token_address, _, token_admin) = create_token_contract(&env, &admin);
        token_admin.mint(&borrower, &20000);

        let contract_id = env.register_contract(None, EscrowContract);
        let client = EscrowContractClient::new(&env, &contract_id);
        client.initialize(&admin);

        // First lock succeeds
        let result1 = client.lock_collateral(
            &1,
            &borrower,
            &lender,
            &token_address,
            &5000,
            &3000,
            &86400,
        );
        assert!(result1);

        // Second lock with same ID fails
        let result2 = client.lock_collateral(
            &1, // Same loan_id
            &borrower,
            &lender,
            &token_address,
            &5000,
            &3000,
            &86400,
        );
        assert!(!result2);
    }

    // ============== Release Collateral Tests ==============

    #[test]
    fn test_release_collateral_success() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let borrower = Address::generate(&env);
        let lender = Address::generate(&env);

        let (token_address, token_client, token_admin) = create_token_contract(&env, &admin);
        token_admin.mint(&borrower, &10000);

        let contract_id = env.register_contract(None, EscrowContract);
        let client = EscrowContractClient::new(&env, &contract_id);
        client.initialize(&admin);

        // Lock collateral
        client.lock_collateral(
            &1,
            &borrower,
            &lender,
            &token_address,
            &5000,
            &3000,
            &86400,
        );

        // Check borrower balance before release
        let borrower_balance_before = token_client.balance(&borrower);

        // Release collateral
        let result = client.release_collateral(&1);
        assert!(result);

        // Check borrower got collateral back
        let borrower_balance_after = token_client.balance(&borrower);
        assert_eq!(borrower_balance_after, borrower_balance_before + 5000);

        // Check escrow is unlocked
        let escrow = client.get_escrow(&1).unwrap();
        assert!(!escrow.is_locked);
        assert!(!escrow.is_liquidated);

        // Check total locked is updated
        assert_eq!(client.get_total_locked(), 0);
    }

    #[test]
    fn test_release_nonexistent_escrow() {
        let (_env, _admin, _, _, client) = setup_test_env();

        let result = client.release_collateral(&999);
        assert!(!result);
    }

    #[test]
    fn test_release_already_released() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let borrower = Address::generate(&env);
        let lender = Address::generate(&env);

        let (token_address, _, token_admin) = create_token_contract(&env, &admin);
        token_admin.mint(&borrower, &10000);

        let contract_id = env.register_contract(None, EscrowContract);
        let client = EscrowContractClient::new(&env, &contract_id);
        client.initialize(&admin);

        // Lock and release
        client.lock_collateral(&1, &borrower, &lender, &token_address, &5000, &3000, &86400);
        client.release_collateral(&1);

        // Try to release again
        let result = client.release_collateral(&1);
        assert!(!result);
    }

    // ============== Liquidation Tests ==============

    #[test]
    fn test_liquidate_success() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let borrower = Address::generate(&env);
        let lender = Address::generate(&env);

        let (token_address, token_client, token_admin) = create_token_contract(&env, &admin);
        token_admin.mint(&borrower, &10000);

        let contract_id = env.register_contract(None, EscrowContract);
        let client = EscrowContractClient::new(&env, &contract_id);
        client.initialize(&admin);

        // Lock collateral
        client.lock_collateral(&1, &borrower, &lender, &token_address, &5000, &3000, &86400);

        // Liquidate
        let lender_balance_before = token_client.balance(&lender);
        let result = client.liquidate(&1);
        assert!(result);

        // Check lender received collateral
        let lender_balance_after = token_client.balance(&lender);
        assert_eq!(lender_balance_after, lender_balance_before + 5000);

        // Check escrow is liquidated
        let escrow = client.get_escrow(&1).unwrap();
        assert!(!escrow.is_locked);
        assert!(escrow.is_liquidated);
    }

    #[test]
    fn test_liquidate_nonexistent() {
        let (_env, _admin, _, _, client) = setup_test_env();

        let result = client.liquidate(&999);
        assert!(!result);
    }

    #[test]
    fn test_liquidate_already_liquidated() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let borrower = Address::generate(&env);
        let lender = Address::generate(&env);

        let (token_address, _, token_admin) = create_token_contract(&env, &admin);
        token_admin.mint(&borrower, &10000);

        let contract_id = env.register_contract(None, EscrowContract);
        let client = EscrowContractClient::new(&env, &contract_id);
        client.initialize(&admin);

        client.lock_collateral(&1, &borrower, &lender, &token_address, &5000, &3000, &86400);
        client.liquidate(&1);

        // Try to liquidate again
        let result = client.liquidate(&1);
        assert!(!result);
    }

    // ============== Query Tests ==============

    #[test]
    fn test_get_escrow() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let borrower = Address::generate(&env);
        let lender = Address::generate(&env);

        let (token_address, _, token_admin) = create_token_contract(&env, &admin);
        token_admin.mint(&borrower, &10000);

        let contract_id = env.register_contract(None, EscrowContract);
        let client = EscrowContractClient::new(&env, &contract_id);
        client.initialize(&admin);

        // Before locking
        assert!(client.get_escrow(&1).is_none());

        // After locking
        client.lock_collateral(&1, &borrower, &lender, &token_address, &5000, &3000, &86400);
        
        let escrow = client.get_escrow(&1).unwrap();
        assert_eq!(escrow.loan_id, 1);
        assert_eq!(escrow.collateral_amount, 5000);
    }

    #[test]
    fn test_is_past_due() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let borrower = Address::generate(&env);
        let lender = Address::generate(&env);

        let (token_address, _, token_admin) = create_token_contract(&env, &admin);
        token_admin.mint(&borrower, &10000);

        let contract_id = env.register_contract(None, EscrowContract);
        let client = EscrowContractClient::new(&env, &contract_id);
        client.initialize(&admin);

        // Lock with 1 day duration
        client.lock_collateral(&1, &borrower, &lender, &token_address, &5000, &3000, &86400);

        // Not past due initially
        assert!(!client.is_past_due(&1));

        // Advance time past due date
        env.ledger().set(LedgerInfo {
            timestamp: env.ledger().timestamp() + 86400 + 1,
            protocol_version: 20,
            sequence_number: env.ledger().sequence(),
            network_id: Default::default(),
            base_reserve: 10,
            min_temp_entry_ttl: 10,
            min_persistent_entry_ttl: 10,
            max_entry_ttl: 3110400,
        });

        assert!(client.is_past_due(&1));
    }

    #[test]
    fn test_get_total_locked_multiple_escrows() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let borrower = Address::generate(&env);
        let lender = Address::generate(&env);

        let (token_address, _, token_admin) = create_token_contract(&env, &admin);
        token_admin.mint(&borrower, &50000);

        let contract_id = env.register_contract(None, EscrowContract);
        let client = EscrowContractClient::new(&env, &contract_id);
        client.initialize(&admin);

        // Lock multiple escrows
        client.lock_collateral(&1, &borrower, &lender, &token_address, &5000, &3000, &86400);
        client.lock_collateral(&2, &borrower, &lender, &token_address, &3000, &2000, &86400);
        client.lock_collateral(&3, &borrower, &lender, &token_address, &7000, &5000, &86400);

        assert_eq!(client.get_total_locked(), 15000);

        // Release one
        client.release_collateral(&2);
        assert_eq!(client.get_total_locked(), 12000);

        // Liquidate one
        client.liquidate(&1);
        assert_eq!(client.get_total_locked(), 7000);
    }
}
