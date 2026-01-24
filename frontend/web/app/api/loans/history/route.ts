

import { NextRequest, NextResponse } from 'next/server';
import { loanEscrowService } from '@/lib/loanEscrowService';
import { permissionService } from '@/lib/permissionService';

export async function GET(request: NextRequest) {
    try {
        const walletAddress = request.nextUrl.searchParams.get('wallet');
        const status = request.nextUrl.searchParams.get('status'); 
        const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50');

        if (!walletAddress) {
            return NextResponse.json(
                { success: false, error: 'Missing wallet parameter' },
                { status: 400 }
            );
        }

        
        if (!walletAddress.startsWith('G') || walletAddress.length !== 56) {
            return NextResponse.json(
                { success: false, error: 'Invalid Stellar wallet address' },
                { status: 400 }
            );
        }

        
        const permission = await permissionService.canAccessLoans(walletAddress);
        if (!permission.allowed) {
            return NextResponse.json(
                {
                    success: false,
                    error: permission.reason,
                    required_kyc_level: permission.required_kyc_level,
                },
                { status: 403 }
            );
        }

        
        let loans = await loanEscrowService.getLoanHistory(walletAddress);

        
        if (status) {
            loans = loans.filter(loan => loan.status === status.toUpperCase());
        }

        
        loans = loans.slice(0, limit);

        
        const stats = {
            total_loans: loans.length,
            active: loans.filter(l => l.status === 'ACTIVE').length,
            repaid: loans.filter(l => l.status === 'REPAID').length,
            defaulted: loans.filter(l => l.status === 'DEFAULTED').length,
            liquidated: loans.filter(l => l.status === 'LIQUIDATED').length,
            total_borrowed: loans.reduce((sum, l) => sum + l.loan_amount, 0),
            total_repaid: loans
                .filter(l => l.status === 'REPAID')
                .reduce((sum, l) => sum + l.total_repayment_amount, 0),
        };

        return NextResponse.json({
            success: true,
            loans: loans.map(loan => ({
                id: loan.id,
                collateral_asset: loan.collateral_asset,
                collateral_amount: loan.collateral_amount,
                loan_amount: loan.loan_amount,
                loan_asset: loan.loan_asset,
                interest_rate: loan.interest_rate,
                duration_days: loan.duration_days,
                total_repayment_amount: loan.total_repayment_amount,
                due_date: loan.due_date,
                status: loan.status,
                created_at: loan.created_at,
                repaid_at: loan.repaid_at,
                repayment_tx_hash: loan.repayment_tx_hash,
                escrow_tx_hash: loan.escrow_tx_hash,
            })),
            statistics: stats,
        });
    } catch (error) {
        console.error('Error fetching loan history:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch loan history' },
            { status: 500 }
        );
    }
}
