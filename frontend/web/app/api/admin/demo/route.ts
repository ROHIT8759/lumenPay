
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'demo-admin-secret';


export async function POST(request: NextRequest) {
    try {
        const adminKey = request.headers.get('x-admin-key');

        if (adminKey !== ADMIN_SECRET) {
            return NextResponse.json(
                { error: 'Unauthorized - Admin access required' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { action } = body;

        switch (action) {
            case 'approve_kyc':
                return await approveKyc(body.walletAddress, body.kycLevel);

            case 'reject_kyc':
                return await rejectKyc(body.walletAddress);

            case 'trigger_default':
                return await triggerLoanDefault(body.loanId);

            case 'clear_all_pending':
                return await clearAllPending();

            case 'get_system_stats':
                return await getSystemStats();

            case 'fund_account':
                return await fundTestAccount(body.walletAddress);

            default:
                return NextResponse.json(
                    { error: 'Invalid action' },
                    { status: 400 }
                );
        }
    } catch (error: any) {
        console.error('Demo control error:', error);
        return NextResponse.json(
            { error: error.message || 'Demo control failed' },
            { status: 500 }
        );
    }
}


async function approveKyc(walletAddress: string, kycLevel: number = 1) {
    if (!walletAddress) {
        return NextResponse.json(
            { error: 'Missing walletAddress' },
            { status: 400 }
        );
    }

    const { data: existing } = await supabase
        .from('kyc_status')
        .select('id')
        .eq('wallet_address', walletAddress)
        .single();

    if (existing) {
        await supabase
            .from('kyc_status')
            .update({
                is_verified: true,
                kyc_level: kycLevel,
                verified_at: new Date().toISOString(),
            })
            .eq('wallet_address', walletAddress);
    } else {
        await supabase.from('kyc_status').insert({
            wallet_address: walletAddress,
            is_verified: true,
            kyc_level: kycLevel,
            verified_at: new Date().toISOString(),
        });
    }

    return NextResponse.json({
        success: true,
        walletAddress,
        kycLevel,
        message: 'KYC approved',
    });
}


async function rejectKyc(walletAddress: string) {
    if (!walletAddress) {
        return NextResponse.json(
            { error: 'Missing walletAddress' },
            { status: 400 }
        );
    }

    await supabase
        .from('kyc_status')
        .update({
            is_verified: false,
            kyc_level: 0,
        })
        .eq('wallet_address', walletAddress);

    return NextResponse.json({
        success: true,
        walletAddress,
        message: 'KYC rejected',
    });
}


async function triggerLoanDefault(loanId: string) {
    if (!loanId) {
        return NextResponse.json(
            { error: 'Missing loanId' },
            { status: 400 }
        );
    }

    const { error } = await supabase
        .from('loans')
        .update({
            status: 'defaulted',
            defaulted_at: new Date().toISOString(),
        })
        .eq('id', loanId);

    if (error) {
        return NextResponse.json(
            { error: 'Failed to trigger default' },
            { status: 500 }
        );
    }

    return NextResponse.json({
        success: true,
        loanId,
        message: 'Loan marked as defaulted',
    });
}


async function clearAllPending() {
    const { error } = await supabase
        .from('transactions')
        .update({ status: 'cancelled' })
        .eq('status', 'pending');

    if (error) {
        return NextResponse.json(
            { error: 'Failed to clear pending transactions' },
            { status: 500 }
        );
    }

    return NextResponse.json({
        success: true,
        message: 'All pending transactions cancelled',
    });
}


async function getSystemStats() {
    const [
        { count: totalUsers },
        { count: totalTransactions },
        { count: pendingTransactions },
        { count: activeLoans },
    ] = await Promise.all([
        supabase.from('wallets').select('*', { count: 'exact', head: true }),
        supabase.from('transactions').select('*', { count: 'exact', head: true }),
        supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('loans').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    ]);

    return NextResponse.json({
        stats: {
            totalUsers: totalUsers || 0,
            totalTransactions: totalTransactions || 0,
            pendingTransactions: pendingTransactions || 0,
            activeLoans: activeLoans || 0,
            timestamp: new Date().toISOString(),
        },
    });
}


async function fundTestAccount(walletAddress: string) {
    if (!walletAddress) {
        return NextResponse.json(
            { error: 'Missing walletAddress' },
            { status: 400 }
        );
    }

    try {
        const response = await fetch(
            `https://friendbot.stellar.org?addr=${encodeURIComponent(walletAddress)}`
        );

        if (!response.ok) {
            throw new Error('Friendbot request failed');
        }

        return NextResponse.json({
            success: true,
            walletAddress,
            message: 'Account funded with testnet XLM',
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to fund account' },
            { status: 500 }
        );
    }
}
