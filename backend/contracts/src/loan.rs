






use soroban_sdk::{
    contract, contractimpl, contracttype, Env, Address, token, Symbol,
};

#[contracttype]
#[derive(Clone)]
pub struct LoanData {
    pub borrower: Address,
    pub lender: Address,
    pub principal_amount: i128,
    pub amount_repaid: i128,
    pub interest_rate_bps: u32, 
    pub tenure_months: u32,
    pub start_time: u64,
    pub next_emi_due: u64,
    pub is_active: bool,
    pub is_defaulted: bool,
}

#[contracttype]
#[derive(Clone)]
pub struct EMISchedule {
    pub loan_id: u64,
    pub emi_number: u32,
    pub due_date: u64,
    pub principal_due: i128,
    pub interest_due: i128,
    pub total_due: i128,
    pub paid: bool,
    pub paid_date: u64,
}

#[contract]
pub struct LoanContract;

#[contractimpl]
impl LoanContract {
    
    pub fn create_loan(
        env: Env,
        loan_id: u64,
        borrower: Address,
        lender: Address,
        principal: i128,
        interest_rate_bps: u32,
        tenure_months: u32,
        token: Address,
    ) -> bool {
        lender.require_auth();

        if principal <= 0 || tenure_months == 0 {
            return false;
        }

        let loan = LoanData {
            borrower: borrower.clone(),
            lender: lender.clone(),
            principal_amount: principal,
            amount_repaid: 0,
            interest_rate_bps,
            tenure_months,
            start_time: env.ledger().timestamp(),
            next_emi_due: env.ledger().timestamp() + (30 * 24 * 60 * 60), 
            is_active: true,
            is_defaulted: false,
        };

        env.storage()
            .persistent()
            .set(&(loan_id, Symbol::new(&env, "loan")), &loan);

        
        let client = token::Client::new(&env, &token);
        client.transfer(&lender, &borrower, &principal);

        env.events().publish(
            (Symbol::new(&env, "loan_created"),),
            (loan_id, borrower, lender, principal),
        );

        true
    }

    
    pub fn pay_emi(
        env: Env,
        loan_id: u64,
        emi_number: u32,
        token: Address,
        amount: i128,
    ) -> bool {
        
        let loan: Option<LoanData> = env
            .storage()
            .persistent()
            .get(&(loan_id, Symbol::new(&env, "loan")));

        let loan = match loan {
            Some(l) => l,
            None => return false,
        };

        if !loan.is_active {
            return false;
        }

        
        loan.borrower.require_auth();

        
        let client = token::Client::new(&env, &token);
        client.transfer(&loan.borrower, &loan.lender, &amount);

        
        let mut updated_loan = loan;
        updated_loan.amount_repaid += amount;
        updated_loan.next_emi_due = env.ledger().timestamp() + (30 * 24 * 60 * 60);

        
        if updated_loan.amount_repaid >= updated_loan.principal_amount {
            updated_loan.is_active = false;
        }

        env.storage()
            .persistent()
            .set(&(loan_id, Symbol::new(&env, "loan")), &updated_loan);

        env.events().publish(
            (Symbol::new(&env, "emi_paid"),),
            (loan_id, emi_number, amount),
        );

        true
    }

    
    pub fn get_loan(env: Env, loan_id: u64) -> Option<LoanData> {
        env.storage()
            .persistent()
            .get(&(loan_id, Symbol::new(&env, "loan")))
    }

    
    pub fn mark_default(env: Env, loan_id: u64) -> bool {
        let loan_opt: Option<LoanData> = env
            .storage()
            .persistent()
            .get(&(loan_id, Symbol::new(&env, "loan")));

        let mut loan = match loan_opt {
            Some(l) => l,
            None => return false,
        };

        loan.lender.require_auth();

        if loan.is_defaulted {
            return false;
        }

        loan.is_defaulted = true;

        env.storage()
            .persistent()
            .set(&(loan_id, Symbol::new(&env, "loan")), &loan);

        env.events().publish(
            (Symbol::new(&env, "loan_defaulted"),),
            loan_id,
        );

        true
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::{Address as _, Env as _};

    #[test]
    fn test_create_loan() {
        
    }
}
