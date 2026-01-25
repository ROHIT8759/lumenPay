

import { supabase } from './supabaseClient';
import { permissionService } from './permissionService';
import { contractService } from './contractService';
import { createCustodialSigner, getCustodialWalletPublicKey } from './custodialWalletSigner';
import { Networks } from '@stellar/stellar-sdk';





export interface LoanCreateParams {
    borrower_wallet: string;
    collateral_asset: 'USDC' | 'XLM';
    collateral_amount: number;
    loan_amount: number;
    interest_rate: number; 
    duration_days: number;
}

export interface CollateralizedLoan {
    id: string;
    borrower_wallet: string;
    collateral_asset: string;
    collateral_amount: number;
    loan_amount: number;
    loan_asset: string;
    interest_rate: number;
    duration_days: number;
    status: 'PENDING' | 'ACTIVE' | 'REPAID' | 'DEFAULTED' | 'LIQUIDATED';
    escrow_tx_hash?: string;
    contract_address?: string;
    created_at: string;
    due_date: string;
    repaid_at?: string;
    repayment_tx_hash?: string;
    liquidation_tx_hash?: string;
    total_repayment_amount: number;
}

export interface LoanSummary {
    active_loans: number;
    total_borrowed: number;
    total_collateral_locked: number;
    upcoming_payments: number;
}






const MIN_COLLATERAL_RATIO = 1.5;


const MAX_LOAN_AMOUNT = 10000; 


const DEFAULT_INTEREST_RATES: Record<number, number> = {
    30: 8.0,   
    60: 10.0,  
    90: 12.0,  
    180: 15.0, 
};





class LoanEscrowService {
    private demoMode: boolean;
    
    constructor() {
        this.demoMode = process.env.KYC_DEMO_MODE === 'true';
    }

    
    async createLoan(params: LoanCreateParams): Promise<{
        success: boolean;
        loan?: CollateralizedLoan;
        error?: string;
    }> {
        const {
            borrower_wallet,
            collateral_asset,
            collateral_amount,
            loan_amount,
            interest_rate,
            duration_days,
        } = params;

        
        const permission = await permissionService.canAccessLoans(borrower_wallet);
        if (!permission.allowed) {
            return { success: false, error: permission.reason };
        }

        
        const requiredCollateral = loan_amount * MIN_COLLATERAL_RATIO;
        if (collateral_amount < requiredCollateral) {
            return {
                success: false,
                error: `Insufficient collateral. Required: ${requiredCollateral} ${collateral_asset}, Provided: ${collateral_amount}`,
            };
        }

        
        if (loan_amount > MAX_LOAN_AMOUNT) {
            return {
                success: false,
                error: `Loan amount exceeds maximum (${MAX_LOAN_AMOUNT} USDC)`,
            };
        }

        
        const dailyRate = interest_rate / 365 / 100;
        const interestAmount = loan_amount * dailyRate * duration_days;
        const totalRepayment = loan_amount + interestAmount;

        
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + duration_days);

        const escrowTxHash = await this.lockCollateralOnChain(borrower_wallet, collateral_asset, collateral_amount);

        
        const { data, error } = await supabase
            .from('collateralized_loans')
            .insert({
                borrower_wallet,
                collateral_asset,
                collateral_amount,
                loan_amount,
                loan_asset: 'USDC',
                interest_rate,
                duration_days,
                status: 'ACTIVE',
                escrow_tx_hash: escrowTxHash,
                due_date: dueDate.toISOString(),
                total_repayment_amount: totalRepayment,
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating loan:', error);
            return { success: false, error: 'Failed to create loan record' };
        }

        
        await this.recordEvent('LOAN_CREATED', escrowTxHash || '', {
            loan_id: data.id,
            borrower: borrower_wallet,
            collateral: `${collateral_amount} ${collateral_asset}`,
            loan: `${loan_amount} USDC`,
        });

        return { success: true, loan: data as CollateralizedLoan };
    }

    
    async repayLoan(
        loanId: string,
        borrowerWallet: string
    ): Promise<{ success: boolean; loan?: CollateralizedLoan; error?: string }> {
        
        const { data: loan, error: fetchError } = await supabase
            .from('collateralized_loans')
            .select('*')
            .eq('id', loanId)
            .eq('borrower_wallet', borrowerWallet)
            .eq('status', 'ACTIVE')
            .single();

        if (fetchError || !loan) {
            return { success: false, error: 'Loan not found or not active' };
        }

        
        const repaymentTxHash = this.demoMode
            ? `demo_repay_${Date.now()}`
            : await this.processRepaymentOnChain(loan);

        
        const { data, error } = await supabase
            .from('collateralized_loans')
            .update({
                status: 'REPAID',
                repaid_at: new Date().toISOString(),
                repayment_tx_hash: repaymentTxHash,
            })
            .eq('id', loanId)
            .select()
            .single();

        if (error) {
            return { success: false, error: 'Failed to update loan status' };
        }

        
        await this.recordEvent('LOAN_REPAID', repaymentTxHash || '', {
            loan_id: loanId,
            borrower: borrowerWallet,
            amount: loan.total_repayment_amount,
        });

        return { success: true, loan: data as CollateralizedLoan };
    }

    
    async liquidateLoan(
        loanId: string,
        adminKey: string
    ): Promise<{ success: boolean; error?: string }> {
        
        if (adminKey !== process.env.ADMIN_SECRET_KEY) {
            return { success: false, error: 'Unauthorized' };
        }

        
        const { data: loan, error: fetchError } = await supabase
            .from('collateralized_loans')
            .select('*')
            .eq('id', loanId)
            .single();

        if (fetchError || !loan) {
            return { success: false, error: 'Loan not found' };
        }

        if (loan.status !== 'ACTIVE' && loan.status !== 'DEFAULTED') {
            return { success: false, error: 'Loan cannot be liquidated' };
        }

        const liquidationTxHash = await this.processLiquidationOnChain(loan);

        
        const { error } = await supabase
            .from('collateralized_loans')
            .update({
                status: 'LIQUIDATED',
                liquidation_tx_hash: liquidationTxHash,
            })
            .eq('id', loanId);

        if (error) {
            return { success: false, error: 'Failed to liquidate loan' };
        }

        
        await this.recordEvent('LOAN_LIQUIDATED', liquidationTxHash, {
            loan_id: loanId,
            borrower: loan.borrower_wallet,
            collateral_seized: `${loan.collateral_amount} ${loan.collateral_asset}`,
        });

        return { success: true };
    }

    
    async markAsDefaulted(loanId: string): Promise<{ success: boolean; error?: string }> {
        const { data: loan, error: fetchError } = await supabase
            .from('collateralized_loans')
            .select('*')
            .eq('id', loanId)
            .eq('status', 'ACTIVE')
            .single();

        if (fetchError || !loan) {
            return { success: false, error: 'Loan not found' };
        }

        
        const dueDate = new Date(loan.due_date);
        if (dueDate > new Date()) {
            return { success: false, error: 'Loan is not yet overdue' };
        }

        
        const { error } = await supabase
            .from('collateralized_loans')
            .update({ status: 'DEFAULTED' })
            .eq('id', loanId);

        if (error) {
            return { success: false, error: 'Failed to mark loan as defaulted' };
        }

        
        await this.recordEvent('LOAN_DEFAULTED', '', {
            loan_id: loanId,
            borrower: loan.borrower_wallet,
        });

        return { success: true };
    }

    
    async getActiveLoans(walletAddress: string): Promise<CollateralizedLoan[]> {
        const { data, error } = await supabase
            .from('collateralized_loans')
            .select('*')
            .eq('borrower_wallet', walletAddress)
            .eq('status', 'ACTIVE')
            .order('created_at', { ascending: false });

        return (data as CollateralizedLoan[]) || [];
    }

    
    async getLoanHistory(walletAddress: string): Promise<CollateralizedLoan[]> {
        const { data, error } = await supabase
            .from('collateralized_loans')
            .select('*')
            .eq('borrower_wallet', walletAddress)
            .order('created_at', { ascending: false });

        return (data as CollateralizedLoan[]) || [];
    }

    
    async getLoan(loanId: string): Promise<CollateralizedLoan | null> {
        const { data, error } = await supabase
            .from('collateralized_loans')
            .select('*')
            .eq('id', loanId)
            .single();

        return (data as CollateralizedLoan) || null;
    }

    
    async getLoanSummary(walletAddress: string): Promise<LoanSummary> {
        const activeLoans = await this.getActiveLoans(walletAddress);

        const totalBorrowed = activeLoans.reduce((sum, l) => sum + l.loan_amount, 0);
        const totalCollateral = activeLoans.reduce((sum, l) => sum + l.collateral_amount, 0);

        
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        const upcomingPayments = activeLoans.filter(l => new Date(l.due_date) <= nextWeek).length;

        return {
            active_loans: activeLoans.length,
            total_borrowed: totalBorrowed,
            total_collateral_locked: totalCollateral,
            upcoming_payments: upcomingPayments,
        };
    }

    
    getSuggestedInterestRate(durationDays: number): number {
        
        const brackets = Object.keys(DEFAULT_INTEREST_RATES).map(Number).sort((a, b) => a - b);

        for (const bracket of brackets) {
            if (durationDays <= bracket) {
                return DEFAULT_INTEREST_RATES[bracket];
            }
        }

        
        return DEFAULT_INTEREST_RATES[180];
    }

    
    calculateLoanParams(loanAmount: number, durationDays: number, interestRate?: number): {
        interest_rate: number;
        total_interest: number;
        total_repayment: number;
        min_collateral: number;
        daily_rate: number;
    } {
        const rate = interestRate || this.getSuggestedInterestRate(durationDays);
        const dailyRate = rate / 365 / 100;
        const totalInterest = loanAmount * dailyRate * durationDays;
        const totalRepayment = loanAmount + totalInterest;
        const minCollateral = loanAmount * MIN_COLLATERAL_RATIO;

        return {
            interest_rate: rate,
            total_interest: Math.round(totalInterest * 100) / 100,
            total_repayment: Math.round(totalRepayment * 100) / 100,
            min_collateral: Math.round(minCollateral * 100) / 100,
            daily_rate: dailyRate,
        };
    }

    /**
     * Lock collateral on-chain using Escrow Contract
     */
    private async lockCollateralOnChain(
        wallet: string,
        asset: string,
        amount: number
    ): Promise<string> {
        try {
            // Check if contracts are configured
            if (!contractService.isContractConfigured('ESCROW')) {
                console.warn('Escrow contract not configured, skipping on-chain lock');
                return '';
            }

            // Get custodial wallet public key
            const publicKey = await getCustodialWalletPublicKey(wallet);
            
            if (!publicKey) {
                throw new Error('Custodial wallet not found for user');
            }
            
            // Generate loan ID (in production, use better ID generation)
            const loanId = Math.floor(Math.random() * 1000000);
            
            // Mock lender address (in production, get from liquidity pool)
            const lenderAddress = process.env.NEXT_PUBLIC_LIQUIDITY_POOL_ADDRESS || publicKey;
            
            // Asset address (for native XLM or tokens)
            const assetAddress = asset === 'XLM' 
                ? 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC' // Native asset contract
                : process.env.STELLAR_USDC_ISSUER || '';

            // Convert amount to stroops (multiply by 10^7 for Stellar)
            const amountInStroops = Math.floor(amount * 10000000).toString();

            // Create custodial signer
            const signTransaction = createCustodialSigner(wallet, Networks.TESTNET);

            // Call escrow contract
            const result = await contractService.lockCollateral(
                loanId,
                publicKey,
                lenderAddress,
                assetAddress,
                amountInStroops,
                signTransaction
            );

            if (result.success && result.transactionHash) {
                return result.transactionHash;
            }

            throw new Error(result.error || 'Failed to lock collateral');
        } catch (error: any) {
            console.error('Lock collateral error:', error);
            // Return empty hash to allow DB-only operation in development
            return '';
        }
    }

    /**
     * Create loan on-chain using Loan Contract
     */
    private async createLoanOnChain(
        loanId: number,
        borrower: string,
        lender: string,
        principal: number,
        interestRateBps: number,
        tenureMonths: number
    ): Promise<string> {
        try {
            if (!contractService.isContractConfigured('LOAN')) {
                console.warn('Loan contract not configured, skipping on-chain creation');
                return '';
            }

            // Get custodial wallet for borrower
            const publicKey = await getCustodialWalletPublicKey(borrower);
            if (!publicKey) {
                throw new Error('Custodial wallet not found for borrower');
            }

            // Token address (USDC or XLM)
            const tokenAddress = process.env.STELLAR_USDC_ISSUER || '';
            const principalInStroops = Math.floor(principal * 10000000).toString();

            // Create custodial signer
            const signTransaction = createCustodialSigner(borrower, Networks.TESTNET);

            const result = await contractService.createLoan(
                loanId,
                borrower,
                lender,
                principalInStroops,
                interestRateBps,
                tenureMonths,
                tokenAddress,
                signTransaction
            );

            if (result.success && result.transactionHash) {
                return result.transactionHash;
            }

            throw new Error(result.error || 'Failed to create loan on-chain');
        } catch (error: any) {
            console.error('Create loan on-chain error:', error);
            return '';
        }
    }

    
    private async processRepaymentOnChain(loan: CollateralizedLoan): Promise<string> {
        
        
        
        
        
        throw new Error('Soroban escrow contract integration required. Please implement repayment processing via contract call.');
    }

    
    private async processLiquidationOnChain(loan: CollateralizedLoan): Promise<string> {
        
        
        
        
        throw new Error('Soroban escrow contract integration required. Please implement liquidation via contract call.');
    }

    
    private async recordEvent(
        eventType: string,
        txHash: string,
        data: Record<string, any>
    ): Promise<void> {
        await supabase.from('blockchain_events').insert({
            event_type: eventType,
            tx_hash: txHash,
            data,
        });
    }
}

export const loanEscrowService = new LoanEscrowService();
