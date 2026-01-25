#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, Map, String, Symbol, Vec,
};

// ============== Data Types ==============

#[derive(Clone, Debug)]
#[contracttype]
pub enum DataKey {
    Admin,
    Assets,
    Holdings(Address),
    Orders(Address),
    OrderCounter,
    TotalVolume(String),
    FeePercent,
    FeeRecipient,
}

#[derive(Clone, Debug)]
#[contracttype]
pub struct Asset {
    pub code: String,
    pub name: String,
    pub price: i128,          // Price in stroops (1 XLM = 10^7 stroops)
    pub total_supply: i128,
    pub available_supply: i128,
    pub is_active: bool,
}

#[derive(Clone, Debug)]
#[contracttype]
pub enum OrderType {
    Buy,
    Sell,
}

#[derive(Clone, Debug)]
#[contracttype]
pub enum OrderStatus {
    Pending,
    Filled,
    PartiallyFilled,
    Cancelled,
}

#[derive(Clone, Debug)]
#[contracttype]
pub struct Order {
    pub id: u64,
    pub trader: Address,
    pub asset_code: String,
    pub order_type: OrderType,
    pub quantity: i128,
    pub filled_quantity: i128,
    pub price: i128,
    pub status: OrderStatus,
    pub timestamp: u64,
}

#[derive(Clone, Debug)]
#[contracttype]
pub struct Holding {
    pub asset_code: String,
    pub quantity: i128,
    pub avg_buy_price: i128,
    pub total_invested: i128,
}

// ============== Events ==============

fn emit_order_created(env: &Env, order_id: u64, trader: &Address, asset_code: &String, order_type: &OrderType, quantity: i128, price: i128) {
    let topics = (symbol_short!("order"), symbol_short!("created"), trader.clone());
    env.events().publish(topics, (order_id, asset_code.clone(), order_type.clone(), quantity, price));
}

fn emit_order_filled(env: &Env, order_id: u64, trader: &Address, asset_code: &String, quantity: i128, price: i128) {
    let topics = (symbol_short!("order"), symbol_short!("filled"), trader.clone());
    env.events().publish(topics, (order_id, asset_code.clone(), quantity, price));
}

fn emit_trade_executed(env: &Env, trader: &Address, asset_code: &String, order_type: &OrderType, quantity: i128, price: i128, total_cost: i128) {
    let topics = (symbol_short!("trade"), asset_code.clone());
    env.events().publish(topics, (trader.clone(), order_type.clone(), quantity, price, total_cost));
}

// ============== Contract ==============

#[contract]
pub struct StockTradingContract;

#[contractimpl]
impl StockTradingContract {
    /// Initialize the contract with an admin
    pub fn initialize(env: Env, admin: Address, fee_recipient: Address, fee_percent: u32) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Contract already initialized");
        }
        
        admin.require_auth();
        
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::FeeRecipient, &fee_recipient);
        env.storage().instance().set(&DataKey::FeePercent, &fee_percent);
        env.storage().instance().set(&DataKey::OrderCounter, &0u64);
        
        // Initialize empty assets map
        let assets: Map<String, Asset> = Map::new(&env);
        env.storage().instance().set(&DataKey::Assets, &assets);
    }

    // ============== Admin Functions ==============

    /// Add a new tradeable asset (admin only)
    pub fn add_asset(
        env: Env,
        code: String,
        name: String,
        initial_price: i128,
        total_supply: i128,
    ) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        let mut assets: Map<String, Asset> = env
            .storage()
            .instance()
            .get(&DataKey::Assets)
            .unwrap_or(Map::new(&env));

        let asset = Asset {
            code: code.clone(),
            name,
            price: initial_price,
            total_supply,
            available_supply: total_supply,
            is_active: true,
        };

        assets.set(code.clone(), asset);
        env.storage().instance().set(&DataKey::Assets, &assets);
        
        // Initialize volume tracking
        env.storage().instance().set(&DataKey::TotalVolume(code), &0i128);
    }

    /// Update asset price (admin only - for price oracle simulation)
    pub fn update_price(env: Env, asset_code: String, new_price: i128) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        let mut assets: Map<String, Asset> = env
            .storage()
            .instance()
            .get(&DataKey::Assets)
            .unwrap();

        let mut asset = assets.get(asset_code.clone()).expect("Asset not found");
        asset.price = new_price;
        assets.set(asset_code, asset);
        env.storage().instance().set(&DataKey::Assets, &assets);
    }

    /// Toggle asset active status (admin only)
    pub fn set_asset_active(env: Env, asset_code: String, is_active: bool) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        let mut assets: Map<String, Asset> = env
            .storage()
            .instance()
            .get(&DataKey::Assets)
            .unwrap();

        let mut asset = assets.get(asset_code.clone()).expect("Asset not found");
        asset.is_active = is_active;
        assets.set(asset_code, asset);
        env.storage().instance().set(&DataKey::Assets, &assets);
    }

    /// Update fee percentage (admin only)
    pub fn set_fee_percent(env: Env, fee_percent: u32) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        env.storage().instance().set(&DataKey::FeePercent, &fee_percent);
    }

    // ============== Trading Functions ==============

    /// Buy an asset at market price
    pub fn buy(env: Env, trader: Address, asset_code: String, quantity: i128) -> Order {
        trader.require_auth();

        let mut assets: Map<String, Asset> = env
            .storage()
            .instance()
            .get(&DataKey::Assets)
            .unwrap();

        let mut asset = assets.get(asset_code.clone()).expect("Asset not found");
        
        if !asset.is_active {
            panic!("Asset is not active for trading");
        }
        
        if asset.available_supply < quantity {
            panic!("Insufficient supply available");
        }

        let price = asset.price;
        let total_cost = price * quantity;
        
        // Calculate fee
        let fee_percent: u32 = env.storage().instance().get(&DataKey::FeePercent).unwrap_or(0);
        let fee = (total_cost * fee_percent as i128) / 10000; // fee_percent is in basis points
        let total_with_fee = total_cost + fee;

        // Update asset supply
        asset.available_supply -= quantity;
        assets.set(asset_code.clone(), asset);
        env.storage().instance().set(&DataKey::Assets, &assets);

        // Update user holdings
        let mut holdings: Map<String, Holding> = env
            .storage()
            .instance()
            .get(&DataKey::Holdings(trader.clone()))
            .unwrap_or(Map::new(&env));

        let holding = if let Some(existing) = holdings.get(asset_code.clone()) {
            let new_quantity = existing.quantity + quantity;
            let new_total_invested = existing.total_invested + total_cost;
            let new_avg_price = new_total_invested / new_quantity;
            Holding {
                asset_code: asset_code.clone(),
                quantity: new_quantity,
                avg_buy_price: new_avg_price,
                total_invested: new_total_invested,
            }
        } else {
            Holding {
                asset_code: asset_code.clone(),
                quantity,
                avg_buy_price: price,
                total_invested: total_cost,
            }
        };

        holdings.set(asset_code.clone(), holding);
        env.storage().instance().set(&DataKey::Holdings(trader.clone()), &holdings);

        // Update volume
        let current_volume: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalVolume(asset_code.clone()))
            .unwrap_or(0);
        env.storage().instance().set(&DataKey::TotalVolume(asset_code.clone()), &(current_volume + total_cost));

        // Create and store order
        let order_id = Self::get_next_order_id(&env);
        let order = Order {
            id: order_id,
            trader: trader.clone(),
            asset_code: asset_code.clone(),
            order_type: OrderType::Buy,
            quantity,
            filled_quantity: quantity,
            price,
            status: OrderStatus::Filled,
            timestamp: env.ledger().timestamp(),
        };

        Self::store_order(&env, &trader, &order);

        // Emit events
        emit_order_created(&env, order_id, &trader, &asset_code, &OrderType::Buy, quantity, price);
        emit_order_filled(&env, order_id, &trader, &asset_code, quantity, price);
        emit_trade_executed(&env, &trader, &asset_code, &OrderType::Buy, quantity, price, total_with_fee);

        order
    }

    /// Sell an asset at market price
    pub fn sell(env: Env, trader: Address, asset_code: String, quantity: i128) -> Order {
        trader.require_auth();

        let mut assets: Map<String, Asset> = env
            .storage()
            .instance()
            .get(&DataKey::Assets)
            .unwrap();

        let mut asset = assets.get(asset_code.clone()).expect("Asset not found");
        
        if !asset.is_active {
            panic!("Asset is not active for trading");
        }

        // Check user holdings
        let mut holdings: Map<String, Holding> = env
            .storage()
            .instance()
            .get(&DataKey::Holdings(trader.clone()))
            .expect("No holdings found");

        let existing_holding = holdings.get(asset_code.clone()).expect("No holding for this asset");
        
        if existing_holding.quantity < quantity {
            panic!("Insufficient holdings to sell");
        }

        let price = asset.price;
        let total_proceeds = price * quantity;
        
        // Calculate fee
        let fee_percent: u32 = env.storage().instance().get(&DataKey::FeePercent).unwrap_or(0);
        let fee = (total_proceeds * fee_percent as i128) / 10000;
        let total_after_fee = total_proceeds - fee;

        // Update asset supply (return to available)
        asset.available_supply += quantity;
        assets.set(asset_code.clone(), asset);
        env.storage().instance().set(&DataKey::Assets, &assets);

        // Update user holdings
        let new_quantity = existing_holding.quantity - quantity;
        if new_quantity > 0 {
            let proportion_sold = quantity * 10000 / existing_holding.quantity;
            let investment_sold = existing_holding.total_invested * proportion_sold / 10000;
            let new_total_invested = existing_holding.total_invested - investment_sold;
            
            let updated_holding = Holding {
                asset_code: asset_code.clone(),
                quantity: new_quantity,
                avg_buy_price: existing_holding.avg_buy_price, // Keep original avg price
                total_invested: new_total_invested,
            };
            holdings.set(asset_code.clone(), updated_holding);
        } else {
            holdings.remove(asset_code.clone());
        }
        env.storage().instance().set(&DataKey::Holdings(trader.clone()), &holdings);

        // Update volume
        let current_volume: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalVolume(asset_code.clone()))
            .unwrap_or(0);
        env.storage().instance().set(&DataKey::TotalVolume(asset_code.clone()), &(current_volume + total_proceeds));

        // Create and store order
        let order_id = Self::get_next_order_id(&env);
        let order = Order {
            id: order_id,
            trader: trader.clone(),
            asset_code: asset_code.clone(),
            order_type: OrderType::Sell,
            quantity,
            filled_quantity: quantity,
            price,
            status: OrderStatus::Filled,
            timestamp: env.ledger().timestamp(),
        };

        Self::store_order(&env, &trader, &order);

        // Emit events
        emit_order_created(&env, order_id, &trader, &asset_code, &OrderType::Sell, quantity, price);
        emit_order_filled(&env, order_id, &trader, &asset_code, quantity, price);
        emit_trade_executed(&env, &trader, &asset_code, &OrderType::Sell, quantity, price, total_after_fee);

        order
    }

    /// Place a limit order (not immediately executed)
    pub fn place_limit_order(
        env: Env,
        trader: Address,
        asset_code: String,
        order_type: OrderType,
        quantity: i128,
        limit_price: i128,
    ) -> Order {
        trader.require_auth();

        let assets: Map<String, Asset> = env
            .storage()
            .instance()
            .get(&DataKey::Assets)
            .unwrap();

        let asset = assets.get(asset_code.clone()).expect("Asset not found");
        
        if !asset.is_active {
            panic!("Asset is not active for trading");
        }

        // For sell orders, verify holdings
        if let OrderType::Sell = order_type {
            let holdings: Map<String, Holding> = env
                .storage()
                .instance()
                .get(&DataKey::Holdings(trader.clone()))
                .expect("No holdings found");

            let existing_holding = holdings.get(asset_code.clone()).expect("No holding for this asset");
            
            if existing_holding.quantity < quantity {
                panic!("Insufficient holdings for limit sell order");
            }
        }

        let order_id = Self::get_next_order_id(&env);
        let order = Order {
            id: order_id,
            trader: trader.clone(),
            asset_code: asset_code.clone(),
            order_type: order_type.clone(),
            quantity,
            filled_quantity: 0,
            price: limit_price,
            status: OrderStatus::Pending,
            timestamp: env.ledger().timestamp(),
        };

        Self::store_order(&env, &trader, &order);
        
        emit_order_created(&env, order_id, &trader, &asset_code, &order_type, quantity, limit_price);

        order
    }

    /// Cancel a pending order
    pub fn cancel_order(env: Env, trader: Address, order_id: u64) {
        trader.require_auth();

        let mut orders: Vec<Order> = env
            .storage()
            .instance()
            .get(&DataKey::Orders(trader.clone()))
            .expect("No orders found");

        let mut found = false;
        for i in 0..orders.len() {
            let mut order = orders.get(i).unwrap();
            if order.id == order_id {
                if order.trader != trader {
                    panic!("Not authorized to cancel this order");
                }
                match order.status {
                    OrderStatus::Pending | OrderStatus::PartiallyFilled => {
                        order.status = OrderStatus::Cancelled;
                        orders.set(i, order);
                        found = true;
                        break;
                    }
                    _ => panic!("Order cannot be cancelled"),
                }
            }
        }

        if !found {
            panic!("Order not found");
        }

        env.storage().instance().set(&DataKey::Orders(trader), &orders);
    }

    // ============== View Functions ==============

    /// Get all available assets
    pub fn get_assets(env: Env) -> Vec<Asset> {
        let assets: Map<String, Asset> = env
            .storage()
            .instance()
            .get(&DataKey::Assets)
            .unwrap_or(Map::new(&env));

        let mut result: Vec<Asset> = Vec::new(&env);
        for (_, asset) in assets.iter() {
            result.push_back(asset);
        }
        result
    }

    /// Get a specific asset
    pub fn get_asset(env: Env, asset_code: String) -> Asset {
        let assets: Map<String, Asset> = env
            .storage()
            .instance()
            .get(&DataKey::Assets)
            .unwrap();

        assets.get(asset_code).expect("Asset not found")
    }

    /// Get user holdings
    pub fn get_user_holdings(env: Env, trader: Address) -> Vec<Holding> {
        let holdings: Map<String, Holding> = env
            .storage()
            .instance()
            .get(&DataKey::Holdings(trader))
            .unwrap_or(Map::new(&env));

        let mut result: Vec<Holding> = Vec::new(&env);
        for (_, holding) in holdings.iter() {
            result.push_back(holding);
        }
        result
    }

    /// Get user's specific holding
    pub fn get_user_holding(env: Env, trader: Address, asset_code: String) -> Option<Holding> {
        let holdings: Map<String, Holding> = env
            .storage()
            .instance()
            .get(&DataKey::Holdings(trader))
            .unwrap_or(Map::new(&env));

        holdings.get(asset_code)
    }

    /// Get user orders
    pub fn get_user_orders(env: Env, trader: Address) -> Vec<Order> {
        env.storage()
            .instance()
            .get(&DataKey::Orders(trader))
            .unwrap_or(Vec::new(&env))
    }

    /// Get a specific order by ID
    pub fn get_order(env: Env, trader: Address, order_id: u64) -> Option<Order> {
        let orders: Vec<Order> = env
            .storage()
            .instance()
            .get(&DataKey::Orders(trader))
            .unwrap_or(Vec::new(&env));

        for order in orders.iter() {
            if order.id == order_id {
                return Some(order);
            }
        }
        None
    }

    /// Get total trading volume for an asset
    pub fn get_asset_volume(env: Env, asset_code: String) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::TotalVolume(asset_code))
            .unwrap_or(0)
    }

    /// Calculate portfolio value for a user
    pub fn get_portfolio_value(env: Env, trader: Address) -> i128 {
        let holdings: Map<String, Holding> = env
            .storage()
            .instance()
            .get(&DataKey::Holdings(trader))
            .unwrap_or(Map::new(&env));

        let assets: Map<String, Asset> = env
            .storage()
            .instance()
            .get(&DataKey::Assets)
            .unwrap_or(Map::new(&env));

        let mut total_value: i128 = 0;
        for (asset_code, holding) in holdings.iter() {
            if let Some(asset) = assets.get(asset_code) {
                total_value += holding.quantity * asset.price;
            }
        }
        total_value
    }

    /// Get profit/loss for a user
    pub fn get_portfolio_pnl(env: Env, trader: Address) -> i128 {
        let holdings: Map<String, Holding> = env
            .storage()
            .instance()
            .get(&DataKey::Holdings(trader))
            .unwrap_or(Map::new(&env));

        let assets: Map<String, Asset> = env
            .storage()
            .instance()
            .get(&DataKey::Assets)
            .unwrap_or(Map::new(&env));

        let mut total_pnl: i128 = 0;
        for (asset_code, holding) in holdings.iter() {
            if let Some(asset) = assets.get(asset_code) {
                let current_value = holding.quantity * asset.price;
                let invested = holding.total_invested;
                total_pnl += current_value - invested;
            }
        }
        total_pnl
    }

    // ============== Helper Functions ==============

    fn get_next_order_id(env: &Env) -> u64 {
        let counter: u64 = env
            .storage()
            .instance()
            .get(&DataKey::OrderCounter)
            .unwrap_or(0);
        let new_counter = counter + 1;
        env.storage().instance().set(&DataKey::OrderCounter, &new_counter);
        new_counter
    }

    fn store_order(env: &Env, trader: &Address, order: &Order) {
        let mut orders: Vec<Order> = env
            .storage()
            .instance()
            .get(&DataKey::Orders(trader.clone()))
            .unwrap_or(Vec::new(env));
        
        orders.push_back(order.clone());
        env.storage().instance().set(&DataKey::Orders(trader.clone()), &orders);
    }
}

// ============== Tests ==============

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::{Address as _, Ledger};

    #[test]
    fn test_initialize() {
        let env = Env::default();
        let contract_id = env.register_contract(None, StockTradingContract);
        let client = StockTradingContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let fee_recipient = Address::generate(&env);

        env.mock_all_auths();
        client.initialize(&admin, &fee_recipient, &100); // 1% fee
    }

    #[test]
    fn test_add_asset_and_buy() {
        let env = Env::default();
        let contract_id = env.register_contract(None, StockTradingContract);
        let client = StockTradingContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let fee_recipient = Address::generate(&env);
        let trader = Address::generate(&env);

        env.mock_all_auths();
        
        client.initialize(&admin, &fee_recipient, &100);
        
        // Add BTC asset
        client.add_asset(
            &String::from_str(&env, "BTC"),
            &String::from_str(&env, "Bitcoin"),
            &500000000000, // $50,000 in stroops
            &21000000,     // 21M supply
        );

        // Buy some BTC
        let order = client.buy(
            &trader,
            &String::from_str(&env, "BTC"),
            &100, // Buy 100 units
        );

        assert_eq!(order.quantity, 100);
        assert!(matches!(order.status, OrderStatus::Filled));

        // Check holdings
        let holdings = client.get_user_holdings(&trader);
        assert_eq!(holdings.len(), 1);
        assert_eq!(holdings.get(0).unwrap().quantity, 100);
    }

    #[test]
    fn test_buy_and_sell() {
        let env = Env::default();
        let contract_id = env.register_contract(None, StockTradingContract);
        let client = StockTradingContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let fee_recipient = Address::generate(&env);
        let trader = Address::generate(&env);

        env.mock_all_auths();
        
        client.initialize(&admin, &fee_recipient, &0); // No fee for test
        
        client.add_asset(
            &String::from_str(&env, "ETH"),
            &String::from_str(&env, "Ethereum"),
            &30000000000, // $3,000
            &1000000,
        );

        // Buy
        client.buy(&trader, &String::from_str(&env, "ETH"), &50);
        
        // Verify holdings
        let holdings = client.get_user_holdings(&trader);
        assert_eq!(holdings.get(0).unwrap().quantity, 50);

        // Sell half
        client.sell(&trader, &String::from_str(&env, "ETH"), &25);
        
        // Verify updated holdings
        let holdings = client.get_user_holdings(&trader);
        assert_eq!(holdings.get(0).unwrap().quantity, 25);
    }

    #[test]
    fn test_portfolio_value() {
        let env = Env::default();
        let contract_id = env.register_contract(None, StockTradingContract);
        let client = StockTradingContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let fee_recipient = Address::generate(&env);
        let trader = Address::generate(&env);

        env.mock_all_auths();
        
        client.initialize(&admin, &fee_recipient, &0);
        
        client.add_asset(
            &String::from_str(&env, "SOL"),
            &String::from_str(&env, "Solana"),
            &1000000000, // $100
            &500000000,
        );

        client.buy(&trader, &String::from_str(&env, "SOL"), &10);
        
        let portfolio_value = client.get_portfolio_value(&trader);
        assert_eq!(portfolio_value, 10 * 1000000000); // 10 * $100
    }
}
