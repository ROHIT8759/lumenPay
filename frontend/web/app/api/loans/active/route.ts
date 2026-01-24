

import { NextRequest, NextResponse } from 'next/server';
import { loanEscrowService } from '@/lib/loanEscrowService';
import { permissionService } from '@/lib/permissionService';

export async function GET(request: NextRequest) {
    try {
        const walletAddress = request.nextUrl.searchParams.get('wallet');

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

        
        const loans = await loanEscrowService.getActiveLoans(walletAddress);
        const summary = await loanEscrowService.getLoanSummary(walletAddress);

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
                days_remaining: Math.max(0, Math.ceil((new Date(loan.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))),
                status: loan.status,
                created_at: loan.created_at,
            })),
            summary: {
                active_loans: summary.active_loans,
                total_borrowed: summary.total_borrowed,
                total_collateral_locked: summary.total_collateral_locked,
                upcoming_payments: summary.upcoming_payments,
            },
        });
    } catch (error) {
        console.error('Error fetching active loans:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch active loans' },
            { status: 500 }
        );
    }
}
