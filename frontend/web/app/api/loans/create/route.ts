

import { NextRequest, NextResponse } from 'next/server';
import { loanEscrowService } from '@/lib/loanEscrowService';

interface LoanCreateRequest {
    borrower_wallet: string;
    collateral_asset: 'USDC' | 'XLM';
    collateral_amount: number;
    loan_amount: number;
    interest_rate?: number;
    duration_days: number;
}

export async function POST(request: NextRequest) {
    try {
        const body: LoanCreateRequest = await request.json();

        
        const requiredFields = ['borrower_wallet', 'collateral_asset', 'collateral_amount', 'loan_amount', 'duration_days'];
        const missingFields = requiredFields.filter(field => body[field as keyof LoanCreateRequest] === undefined);

        if (missingFields.length > 0) {
            return NextResponse.json(
                { success: false, error: `Missing required fields: ${missingFields.join(', ')}` },
                { status: 400 }
            );
        }

        
        if (!body.borrower_wallet.startsWith('G') || body.borrower_wallet.length !== 56) {
            return NextResponse.json(
                { success: false, error: 'Invalid Stellar wallet address' },
                { status: 400 }
            );
        }

        
        if (!['USDC', 'XLM'].includes(body.collateral_asset)) {
            return NextResponse.json(
                { success: false, error: 'Invalid collateral asset. Must be USDC or XLM' },
                { status: 400 }
            );
        }

        
        if (body.collateral_amount <= 0 || body.loan_amount <= 0) {
            return NextResponse.json(
                { success: false, error: 'Amounts must be greater than 0' },
                { status: 400 }
            );
        }

        
        if (body.duration_days < 7 || body.duration_days > 365) {
            return NextResponse.json(
                { success: false, error: 'Duration must be between 7 and 365 days' },
                { status: 400 }
            );
        }

        
        const interestRate = body.interest_rate || loanEscrowService.getSuggestedInterestRate(body.duration_days);

        
        const result = await loanEscrowService.createLoan({
            borrower_wallet: body.borrower_wallet,
            collateral_asset: body.collateral_asset,
            collateral_amount: body.collateral_amount,
            loan_amount: body.loan_amount,
            interest_rate: interestRate,
            duration_days: body.duration_days,
        });

        if (!result.success) {
            return NextResponse.json(
                { success: false, error: result.error },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Loan created successfully',
            loan: {
                id: result.loan!.id,
                borrower_wallet: result.loan!.borrower_wallet,
                collateral_asset: result.loan!.collateral_asset,
                collateral_amount: result.loan!.collateral_amount,
                loan_amount: result.loan!.loan_amount,
                interest_rate: result.loan!.interest_rate,
                duration_days: result.loan!.duration_days,
                total_repayment_amount: result.loan!.total_repayment_amount,
                due_date: result.loan!.due_date,
                status: result.loan!.status,
                escrow_tx_hash: result.loan!.escrow_tx_hash,
                created_at: result.loan!.created_at,
            },
        });
    } catch (error) {
        console.error('Error creating loan:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create loan' },
            { status: 500 }
        );
    }
}


export async function GET(request: NextRequest) {
    try {
        const loanAmount = parseFloat(request.nextUrl.searchParams.get('amount') || '0');
        const durationDays = parseInt(request.nextUrl.searchParams.get('duration') || '30');

        if (loanAmount <= 0) {
            return NextResponse.json(
                { success: false, error: 'Invalid loan amount' },
                { status: 400 }
            );
        }

        const params = loanEscrowService.calculateLoanParams(loanAmount, durationDays);

        return NextResponse.json({
            success: true,
            loan_amount: loanAmount,
            duration_days: durationDays,
            ...params,
        });
    } catch (error) {
        console.error('Error calculating loan params:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to calculate loan parameters' },
            { status: 500 }
        );
    }
}
