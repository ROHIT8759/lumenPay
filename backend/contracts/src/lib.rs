#![no_std]

// StellarPay Smart Contracts
// 
// For hackathon MVP, only escrow is enabled.
// Other modules can be enabled when ready:
// - payment: Direct payment processing (use Stellar SDK instead for MVP)
// - loan: DeFi loan management
// - kyc: On-chain KYC verification
// - credit: Credit scoring

// Disabled for MVP - use Stellar SDK for payments
// pub mod payment;
// pub mod loan;
// pub mod kyc;
// pub mod credit;

// Active module: Escrow for secure transactions
pub mod escrow;

// Active module: Real World Asset (RWA) tokenization
pub mod rwa;

// Test modules
#[cfg(test)]
mod escrow_tests;
#[cfg(test)]
mod rwa_tests;
