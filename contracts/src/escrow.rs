













use soroban_sdk::{
    contract, contractimpl, contracttype, Env, Address, Symbol, token,
};





#[contracttype]
#[derive(Clone)]
pub struct EscrowData {
    pub borrower: Address,
    pub lender: Address,           
    pub loan_id: u64,
    pub collateral_token: Address, 
    pub collateral_amount: i128,
    pub loan_amount: i128,
    pub created_at: u64,
    pub due_date: u64,
    pub is_locked: bool,
    pub is_liquidated: bool,
}

#[contracttype]
pub enum EscrowKey {
    Escrow(u64),      
    Admin,            
    TotalLocked,      
}





#[contract]
pub struct EscrowContract;

#[contractimpl]
impl EscrowContract {
    
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().persistent().has(&EscrowKey::Admin) {
            panic!("Contract already initialized");
        }
        env.storage().persistent().set(&EscrowKey::Admin, &admin);
        env.storage().persistent().set(&EscrowKey::TotalLocked, &0i128);
    }

    
    
    
    
    
    
    
    
    
    
    pub fn lock_collateral(
        env: Env,
        loan_id: u64,
        borrower: Address,
        lender: Address,
        collateral_token: Address,
        collateral_amount: i128,
        loan_amount: i128,
        duration_seconds: u64,
    ) -> bool {
        
        borrower.require_auth();

        
        if collateral_amount <= 0 || loan_amount <= 0 {
            return false;
        }

        
        if env.storage().persistent().has(&EscrowKey::Escrow(loan_id)) {
            return false;
        }

        
        let client = token::Client::new(&env, &collateral_token);
        client.transfer(&borrower, &env.current_contract_address(), &collateral_amount);

        
        let escrow = EscrowData {
            borrower: borrower.clone(),
            lender: lender.clone(),
            loan_id,
            collateral_token,
            collateral_amount,
            loan_amount,
            created_at: env.ledger().timestamp(),
            due_date: env.ledger().timestamp() + duration_seconds,
            is_locked: true,
            is_liquidated: false,
        };

        
        env.storage().persistent().set(&EscrowKey::Escrow(loan_id), &escrow);

        
        let total: i128 = env.storage().persistent()
            .get(&EscrowKey::TotalLocked)
            .unwrap_or(0);
        env.storage().persistent().set(&EscrowKey::TotalLocked, &(total + collateral_amount));

        
        env.events().publish(
            (Symbol::new(&env, "CollateralLocked"),),
            (loan_id, borrower, collateral_amount),
        );

        true
    }

    
    pub fn release_collateral(env: Env, loan_id: u64) -> bool {
        
        let escrow: EscrowData = match env.storage().persistent().get(&EscrowKey::Escrow(loan_id)) {
            Some(e) => e,
            None => return false,
        };

        if !escrow.is_locked || escrow.is_liquidated {
            return false;
        }

        
        escrow.lender.require_auth();

        
        let client = token::Client::new(&env, &escrow.collateral_token);
        client.transfer(
            &env.current_contract_address(),
            &escrow.borrower,
            &escrow.collateral_amount,
        );

        
        let mut updated_escrow = escrow.clone();
        updated_escrow.is_locked = false;

        env.storage().persistent().set(&EscrowKey::Escrow(loan_id), &updated_escrow);

        
        let total: i128 = env.storage().persistent()
            .get(&EscrowKey::TotalLocked)
            .unwrap_or(0);
        env.storage().persistent().set(&EscrowKey::TotalLocked, &(total - escrow.collateral_amount));

        
        env.events().publish(
            (Symbol::new(&env, "CollateralReleased"),),
            (loan_id, escrow.borrower, escrow.collateral_amount),
        );

        true
    }

    
    
    pub fn liquidate(env: Env, loan_id: u64) -> bool {
        
        let admin: Address = env.storage().persistent()
            .get(&EscrowKey::Admin)
            .expect("Contract not initialized");

        
        admin.require_auth();

        
        let escrow: EscrowData = match env.storage().persistent().get(&EscrowKey::Escrow(loan_id)) {
            Some(e) => e,
            None => return false,
        };

        if !escrow.is_locked || escrow.is_liquidated {
            return false;
        }

        
        

        
        let client = token::Client::new(&env, &escrow.collateral_token);
        client.transfer(
            &env.current_contract_address(),
            &escrow.lender,
            &escrow.collateral_amount,
        );

        
        let mut updated_escrow = escrow.clone();
        updated_escrow.is_locked = false;
        updated_escrow.is_liquidated = true;

        env.storage().persistent().set(&EscrowKey::Escrow(loan_id), &updated_escrow);

        
        let total: i128 = env.storage().persistent()
            .get(&EscrowKey::TotalLocked)
            .unwrap_or(0);
        env.storage().persistent().set(&EscrowKey::TotalLocked, &(total - escrow.collateral_amount));

        
        env.events().publish(
            (Symbol::new(&env, "Liquidated"),),
            (loan_id, escrow.borrower, escrow.collateral_amount),
        );

        true
    }

    
    pub fn get_escrow(env: Env, loan_id: u64) -> Option<EscrowData> {
        env.storage().persistent().get(&EscrowKey::Escrow(loan_id))
    }

    
    pub fn is_past_due(env: Env, loan_id: u64) -> bool {
        let escrow: EscrowData = match env.storage().persistent().get(&EscrowKey::Escrow(loan_id)) {
            Some(e) => e,
            None => return false,
        };

        escrow.is_locked && env.ledger().timestamp() > escrow.due_date
    }

    
    pub fn get_total_locked(env: Env) -> i128 {
        env.storage().persistent()
            .get(&EscrowKey::TotalLocked)
            .unwrap_or(0)
    }

    
    pub fn update_admin(env: Env, new_admin: Address) {
        let current_admin: Address = env.storage().persistent()
            .get(&EscrowKey::Admin)
            .expect("Contract not initialized");

        current_admin.require_auth();

        env.storage().persistent().set(&EscrowKey::Admin, &new_admin);
    }

    
    pub fn get_admin(env: Env) -> Address {
        env.storage().persistent()
            .get(&EscrowKey::Admin)
            .expect("Contract not initialized")
    }
}





#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::{Address as _, Env as _};

    #[test]
    fn test_initialize() {
        let env = Env::default();
        let admin = Address::random(&env);
        
        let contract_id = env.register_contract(None, EscrowContract);
        let client = EscrowContractClient::new(&env, &contract_id);
        
        client.initialize(&admin);
        
        assert_eq!(client.get_admin(), admin);
        assert_eq!(client.get_total_locked(), 0);
    }

    #[test]
    fn test_lock_and_release() {
        
        
    }
}
