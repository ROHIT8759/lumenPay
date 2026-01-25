use soroban_sdk::{
    contract, contractimpl, contracttype, Env, Address, String, token, Symbol,
};

#[contract]
pub struct PaymentContract;

#[contracttype]
#[derive(Clone)]
pub struct PaymentRecord {
    pub from: Address,
    pub to: Address,
    pub amount: i128,
    pub asset: String,
    pub timestamp: u64,
    pub tx_id: String,
}

#[contractimpl]
impl PaymentContract {
    pub fn pay(
        env: Env,
        token: Address,
        from: Address,
        to: Address,
        amount: i128,
    ) -> bool {
        from.require_auth();

        if amount <= 0 {
            return false;
        }

        let client = token::Client::new(&env, &token);
        client.transfer(&from, &to, &amount);

        env.events().publish(
            (Symbol::new(&env, "payment"),),
            (from.clone(), to.clone(), amount),
        );

        true
    }

    pub fn batch_pay(
        env: Env,
        token: Address,
        from: Address,
        recipients: soroban_sdk::Vec<Address>,
        amounts: soroban_sdk::Vec<i128>,
    ) -> bool {
        from.require_auth();

        if recipients.len() != amounts.len() {
            return false;
        }

        let client = token::Client::new(&env, &token);

        for i in 0..recipients.len() {
            if let (Some(to), Some(amt)) = (recipients.get(i), amounts.get(i)) {
                if amt > 0 {
                    client.transfer(&from, &to, &amt);
                }
            }
        }

        env.events().publish(
            (Symbol::new(&env, "batch_payment"),),
            (from, recipients.len(), amounts.len()),
        );

        true
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{Env, testutils::Address as _};

    #[test]
    fn test_payment() {
        let env = Env::default();
        let contract_id = env.register_contract(None, PaymentContract);
        let _client = PaymentContractClient::new(&env, &contract_id);

        // Test implementation would go here
    }
}
