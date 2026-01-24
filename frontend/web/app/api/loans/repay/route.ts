

import { NextRequest, NextResponse } from 'next/server';
import { loanEscrowService } from '@/lib/loanEscrowService';

interface RepayRequest {
    loan_id: string;
    borrower_wallet: string;
}

export async function POST(request: NextRequest) {
    try {
        const body: RepayRequest = await request.json();

        
        if (!body.loan_id || !body.borrower_wallet) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields: loan_id, borrower_wallet' },
                { status: 400 }
            );
        }

        
        if (!body.borrower_wallet.startsWith('G') || body.borrower_wallet.length !== 56) {
            return NextResponse.json(
                { success: false, error: 'Invalid Stellar wallet address' },
                { status: 400 }
            );
        }

        
        const loan = await loanEscrowService.getLoan(body.loan_id);
        if (!loan) {
            return NextResponse.json(
                { success: false, error: 'Loan not found' },
                { status: 404 }
            );
        }

        
        if (loan.borrower_wallet !== body.borrower_wallet) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized - wallet does not match loan borrower' },
                { status: 403 }
            );
        }

        
        const result = await loanEscrowService.repayLoan(body.loan_id, body.borrower_wallet);

        if (!result.success) {
            return NextResponse.json(
                { success: false, error: result.error },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Loan repaid successfully',
            loan: {
                id: result.loan!.id,
                status: result.loan!.status,
                repaid_at: result.loan!.repaid_at,
                repayment_tx_hash: result.loan!.repayment_tx_hash,
                collateral_released: true,
            },
        });
    } catch (error) {
        console.error('Error repaying loan:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to process loan repayment' },
            { status: 500 }
        );
    }
}
