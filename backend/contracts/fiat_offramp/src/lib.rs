#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, token, Address, Env, Map, String, Symbol, Vec,
};

// Off-ramp request types
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum OfframpType {
    UPI,
    Bank,
}

// Request status
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum RequestStatus {
    Pending,
    Processing,
    Completed,
    Failed,
    Cancelled,
}

// Off-ramp request structure
#[contracttype]
#[derive(Clone)]
pub struct OfframpRequest {
    pub id: u64,
    pub user: Address,
    pub offramp_type: OfframpType,
    pub amount_xlm: i128,
    pub amount_fiat: i128,        // In smallest unit (paisa for INR)
    pub currency: Symbol,         // INR, USD, etc.
    pub recipient_id: String,     // UPI ID or Bank Account
    pub recipient_name: String,
    pub ifsc_code: String,        // For bank transfers
    pub status: RequestStatus,
    pub created_at: u64,
    pub processed_at: u64,
    pub exchange_rate: i128,      // Rate at time of request (scaled by 10^7)
    pub fee: i128,                // Fee in XLM
}

// Contract data keys
#[contracttype]
pub enum DataKey {
    Admin,
    FeeCollector,
    BaseFeePercent,          // Fee percentage (scaled by 100, so 100 = 1%)
    MinAmount,               // Minimum XLM amount
    MaxAmount,               // Maximum XLM amount
    ExchangeRate(Symbol),    // Exchange rate for currency
    RequestCounter,
    Request(u64),
    UserRequests(Address),
    ProcessingTimeHours(OfframpType),
    TotalVolume,
    Paused,
}

#[contract]
pub struct FiatOfframpContract;

#[contractimpl]
impl FiatOfframpContract {
    /// Initialize the contract
    pub fn initialize(
        env: Env,
        admin: Address,
        fee_collector: Address,
        base_fee_percent: u32,
    ) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Already initialized");
        }

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::FeeCollector, &fee_collector);
        env.storage().instance().set(&DataKey::BaseFeePercent, &base_fee_percent);
        env.storage().instance().set(&DataKey::RequestCounter, &0u64);
        env.storage().instance().set(&DataKey::TotalVolume, &0i128);
        env.storage().instance().set(&DataKey::Paused, &false);

        // Default limits (in stroops: 1 XLM = 10^7 stroops)
        env.storage().instance().set(&DataKey::MinAmount, &10_000_000i128);  // 1 XLM min
        env.storage().instance().set(&DataKey::MaxAmount, &100_000_000_000i128); // 10,000 XLM max

        // Default processing times (in hours)
        env.storage().instance().set(&DataKey::ProcessingTimeHours(OfframpType::UPI), &1u32);
        env.storage().instance().set(&DataKey::ProcessingTimeHours(OfframpType::Bank), &24u32);

        // Default exchange rate for INR (example: 1 XLM = 10 INR, scaled by 10^7)
        let inr_symbol = symbol_short!("INR");
        env.storage().instance().set(&DataKey::ExchangeRate(inr_symbol), &100_000_000i128);
    }

    /// Set exchange rate for a currency (admin only)
    pub fn set_exchange_rate(env: Env, admin: Address, currency: Symbol, rate: i128) {
        admin.require_auth();
        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        if admin != stored_admin {
            panic!("Unauthorized");
        }
        env.storage().instance().set(&DataKey::ExchangeRate(currency), &rate);
    }

    /// Create UPI off-ramp request
    pub fn request_upi_offramp(
        env: Env,
        user: Address,
        amount_xlm: i128,
        upi_id: String,
        recipient_name: String,
    ) -> u64 {
        user.require_auth();
        Self::check_not_paused(&env);
        Self::validate_amount(&env, amount_xlm);

        let currency = symbol_short!("INR");
        let exchange_rate: i128 = env.storage().instance().get(&DataKey::ExchangeRate(currency.clone())).unwrap_or(100_000_000);
        let fee = Self::calculate_fee(&env, amount_xlm);
        let net_amount = amount_xlm - fee;
        let amount_fiat = (net_amount * exchange_rate) / 10_000_000;

        let request_id = Self::create_request(
            &env,
            user,
            OfframpType::UPI,
            amount_xlm,
            amount_fiat,
            currency,
            upi_id,
            recipient_name,
            String::from_str(&env, ""),
            exchange_rate,
            fee,
        );

        request_id
    }

    /// Create Bank off-ramp request
    pub fn request_bank_offramp(
        env: Env,
        user: Address,
        amount_xlm: i128,
        account_number: String,
        recipient_name: String,
        ifsc_code: String,
    ) -> u64 {
        user.require_auth();
        Self::check_not_paused(&env);
        Self::validate_amount(&env, amount_xlm);

        let currency = symbol_short!("INR");
        let exchange_rate: i128 = env.storage().instance().get(&DataKey::ExchangeRate(currency.clone())).unwrap_or(100_000_000);
        let fee = Self::calculate_fee(&env, amount_xlm);
        let net_amount = amount_xlm - fee;
        let amount_fiat = (net_amount * exchange_rate) / 10_000_000;

        let request_id = Self::create_request(
            &env,
            user,
            OfframpType::Bank,
            amount_xlm,
            amount_fiat,
            currency,
            account_number,
            recipient_name,
            ifsc_code,
            exchange_rate,
            fee,
        );

        request_id
    }

    /// Process a request (admin/oracle only)
    pub fn process_request(env: Env, admin: Address, request_id: u64, success: bool) {
        admin.require_auth();
        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        if admin != stored_admin {
            panic!("Unauthorized");
        }

        let mut request: OfframpRequest = env.storage().persistent().get(&DataKey::Request(request_id)).unwrap();
        
        if request.status != RequestStatus::Pending && request.status != RequestStatus::Processing {
            panic!("Request cannot be processed");
        }

        request.status = if success { RequestStatus::Completed } else { RequestStatus::Failed };
        request.processed_at = env.ledger().timestamp();

        env.storage().persistent().set(&DataKey::Request(request_id), &request);

        // Emit event
        let event_symbol = if success { symbol_short!("completed") } else { symbol_short!("failed") };
        env.events().publish((symbol_short!("offramp"), event_symbol), request_id);
    }

    /// Cancel a pending request (user only)
    pub fn cancel_request(env: Env, user: Address, request_id: u64) {
        user.require_auth();

        let mut request: OfframpRequest = env.storage().persistent().get(&DataKey::Request(request_id)).unwrap();
        
        if request.user != user {
            panic!("Not your request");
        }

        if request.status != RequestStatus::Pending {
            panic!("Can only cancel pending requests");
        }

        request.status = RequestStatus::Cancelled;
        env.storage().persistent().set(&DataKey::Request(request_id), &request);

        env.events().publish((symbol_short!("offramp"), symbol_short!("cancelled")), request_id);
    }

    /// Get request details
    pub fn get_request(env: Env, request_id: u64) -> OfframpRequest {
        env.storage().persistent().get(&DataKey::Request(request_id)).unwrap()
    }

    /// Get user's request IDs
    pub fn get_user_requests(env: Env, user: Address) -> Vec<u64> {
        env.storage().persistent().get(&DataKey::UserRequests(user)).unwrap_or(Vec::new(&env))
    }

    /// Get processing time for offramp type
    pub fn get_processing_time(env: Env, offramp_type: OfframpType) -> u32 {
        env.storage().instance().get(&DataKey::ProcessingTimeHours(offramp_type)).unwrap_or(24)
    }

    /// Get current exchange rate
    pub fn get_exchange_rate(env: Env, currency: Symbol) -> i128 {
        env.storage().instance().get(&DataKey::ExchangeRate(currency)).unwrap_or(0)
    }

    /// Get fee for amount
    pub fn get_fee(env: Env, amount: i128) -> i128 {
        Self::calculate_fee(&env, amount)
    }

    /// Get total volume processed
    pub fn get_total_volume(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::TotalVolume).unwrap_or(0)
    }

    /// Pause/unpause contract (admin only)
    pub fn set_paused(env: Env, admin: Address, paused: bool) {
        admin.require_auth();
        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        if admin != stored_admin {
            panic!("Unauthorized");
        }
        env.storage().instance().set(&DataKey::Paused, &paused);
    }

    // Internal helper functions
    fn create_request(
        env: &Env,
        user: Address,
        offramp_type: OfframpType,
        amount_xlm: i128,
        amount_fiat: i128,
        currency: Symbol,
        recipient_id: String,
        recipient_name: String,
        ifsc_code: String,
        exchange_rate: i128,
        fee: i128,
    ) -> u64 {
        let mut counter: u64 = env.storage().instance().get(&DataKey::RequestCounter).unwrap_or(0);
        counter += 1;

        let request = OfframpRequest {
            id: counter,
            user: user.clone(),
            offramp_type: offramp_type.clone(),
            amount_xlm,
            amount_fiat,
            currency,
            recipient_id,
            recipient_name,
            ifsc_code,
            status: RequestStatus::Pending,
            created_at: env.ledger().timestamp(),
            processed_at: 0,
            exchange_rate,
            fee,
        };

        env.storage().persistent().set(&DataKey::Request(counter), &request);
        env.storage().instance().set(&DataKey::RequestCounter, &counter);

        // Track user requests
        let mut user_requests: Vec<u64> = env.storage().persistent()
            .get(&DataKey::UserRequests(user.clone()))
            .unwrap_or(Vec::new(env));
        user_requests.push_back(counter);
        env.storage().persistent().set(&DataKey::UserRequests(user), &user_requests);

        // Update total volume
        let mut total_volume: i128 = env.storage().instance().get(&DataKey::TotalVolume).unwrap_or(0);
        total_volume += amount_xlm;
        env.storage().instance().set(&DataKey::TotalVolume, &total_volume);

        // Emit event
        let type_symbol = match offramp_type {
            OfframpType::UPI => symbol_short!("upi"),
            OfframpType::Bank => symbol_short!("bank"),
        };
        env.events().publish((symbol_short!("offramp"), symbol_short!("created"), type_symbol), counter);

        counter
    }

    fn calculate_fee(env: &Env, amount: i128) -> i128 {
        let fee_percent: u32 = env.storage().instance().get(&DataKey::BaseFeePercent).unwrap_or(100); // 1% default
        (amount * fee_percent as i128) / 10000
    }

    fn validate_amount(env: &Env, amount: i128) {
        let min: i128 = env.storage().instance().get(&DataKey::MinAmount).unwrap();
        let max: i128 = env.storage().instance().get(&DataKey::MaxAmount).unwrap();
        
        if amount < min {
            panic!("Amount below minimum");
        }
        if amount > max {
            panic!("Amount exceeds maximum");
        }
    }

    fn check_not_paused(env: &Env) {
        let paused: bool = env.storage().instance().get(&DataKey::Paused).unwrap_or(false);
        if paused {
            panic!("Contract is paused");
        }
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::{Address as _, Ledger};

    #[test]
    fn test_initialize() {
        let env = Env::default();
        let contract_id = env.register_contract(None, FiatOfframpContract);
        let client = FiatOfframpContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let fee_collector = Address::generate(&env);

        client.initialize(&admin, &fee_collector, &100);
    }

    #[test]
    fn test_upi_offramp() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, FiatOfframpContract);
        let client = FiatOfframpContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let fee_collector = Address::generate(&env);
        let user = Address::generate(&env);

        client.initialize(&admin, &fee_collector, &100);

        let upi_id = String::from_str(&env, "user@upi");
        let name = String::from_str(&env, "John Doe");

        let request_id = client.request_upi_offramp(&user, &100_000_000, &upi_id, &name);
        assert_eq!(request_id, 1);

        let request = client.get_request(&request_id);
        assert_eq!(request.offramp_type, OfframpType::UPI);
    }
}
