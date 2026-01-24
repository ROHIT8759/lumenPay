

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { loanEscrowService } from '@/lib/loanEscrowService';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || 'demo-admin-key';


function verifyAdmin(request: NextRequest): boolean {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return false;

    const token = authHeader.replace('Bearer ', '');
    return token === ADMIN_SECRET_KEY;
}

export async function POST(request: NextRequest) {
    try {
        
        if (!verifyAdmin(request)) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized - invalid admin key' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { action, ...params } = body;

        if (!action) {
            return NextResponse.json(
                { success: false, error: 'Missing action parameter' },
                { status: 400 }
            );
        }

        switch (action) {
            case 'kyc/approve':
                return await handleKYCApprove(params);

            case 'kyc/reject':
                return await handleKYCReject(params);

            case 'loan/default':
                return await handleLoanDefault(params);

            case 'loan/liquidate':
                return await handleLoanLiquidate(params);

            case 'price/override':
                return await handlePriceOverride(params);

            case 'override/remove':
                return await handleRemoveOverride(params);

            default:
                return NextResponse.json(
                    { success: false, error: `Unknown action: ${action}` },
                    { status: 400 }
                );
        }
    } catch (error) {
        console.error('Admin action error:', error);
        return NextResponse.json(
            { success: false, error: 'Admin action failed' },
            { status: 500 }
        );
    }
}





async function handleKYCApprove(params: { wallet_address: string; kyc_level?: string }) {
    const { wallet_address, kyc_level = 'KYC_2' } = params;

    if (!wallet_address) {
        return NextResponse.json(
            { success: false, error: 'Missing wallet_address' },
            { status: 400 }
        );
    }

    
    const { data, error } = await supabase
        .from('kyc_submissions')
        .update({
            status: 'VERIFIED',
            kyc_level,
            verified_at: new Date().toISOString(),
        })
        .eq('wallet_address', wallet_address)
        .select()
        .single();

    if (error) {
        
        const { data: newData, error: insertError } = await supabase
            .from('kyc_submissions')
            .insert({
                wallet_address,
                full_name: 'Admin Approved',
                dob: '1990-01-01',
                country: 'US',
                document_type: 'PASSPORT',
                document_number: 'ADMIN-OVERRIDE',
                status: 'VERIFIED',
                kyc_level,
                verified_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (insertError) {
            return NextResponse.json(
                { success: false, error: 'Failed to approve KYC' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: `KYC approved (created new) for ${wallet_address}`,
            kyc_level,
        });
    }

    return NextResponse.json({
        success: true,
        message: `KYC approved for ${wallet_address}`,
        kyc_level: data.kyc_level,
    });
}

async function handleKYCReject(params: { wallet_address: string; reason?: string }) {
    const { wallet_address, reason = 'Rejected by admin' } = params;

    if (!wallet_address) {
        return NextResponse.json(
            { success: false, error: 'Missing wallet_address' },
            { status: 400 }
        );
    }

    const { error } = await supabase
        .from('kyc_submissions')
        .update({
            status: 'REJECTED',
            rejection_reason: reason,
        })
        .eq('wallet_address', wallet_address);

    if (error) {
        return NextResponse.json(
            { success: false, error: 'Failed to reject KYC' },
            { status: 500 }
        );
    }

    return NextResponse.json({
        success: true,
        message: `KYC rejected for ${wallet_address}`,
        reason,
    });
}





async function handleLoanDefault(params: { loan_id: string }) {
    const { loan_id } = params;

    if (!loan_id) {
        return NextResponse.json(
            { success: false, error: 'Missing loan_id' },
            { status: 400 }
        );
    }

    const { error } = await supabase
        .from('collateralized_loans')
        .update({ status: 'DEFAULTED' })
        .eq('id', loan_id);

    if (error) {
        return NextResponse.json(
            { success: false, error: 'Failed to mark loan as defaulted' },
            { status: 500 }
        );
    }

    return NextResponse.json({
        success: true,
        message: `Loan ${loan_id} marked as defaulted`,
    });
}

async function handleLoanLiquidate(params: { loan_id: string }) {
    const { loan_id } = params;

    if (!loan_id) {
        return NextResponse.json(
            { success: false, error: 'Missing loan_id' },
            { status: 400 }
        );
    }

    const result = await loanEscrowService.liquidateLoan(loan_id, ADMIN_SECRET_KEY);

    if (!result.success) {
        return NextResponse.json(
            { success: false, error: result.error },
            { status: 400 }
        );
    }

    return NextResponse.json({
        success: true,
        message: `Loan ${loan_id} liquidated`,
    });
}





async function handlePriceOverride(params: { symbol: string; price: number; change?: number }) {
    const { symbol, price, change = 0 } = params;

    if (!symbol || price === undefined) {
        return NextResponse.json(
            { success: false, error: 'Missing symbol or price' },
            { status: 400 }
        );
    }

    const { error } = await supabase
        .from('admin_overrides')
        .upsert({
            override_type: 'PRICE',
            target_id: symbol.toUpperCase(),
            override_value: { price, change },
            active: true,
        }, { onConflict: 'override_type,target_id' });

    if (error) {
        
        const { error: insertError } = await supabase
            .from('admin_overrides')
            .insert({
                override_type: 'PRICE',
                target_id: symbol.toUpperCase(),
                override_value: { price, change },
                active: true,
            });

        if (insertError) {
            return NextResponse.json(
                { success: false, error: 'Failed to set price override' },
                { status: 500 }
            );
        }
    }

    return NextResponse.json({
        success: true,
        message: `Price override set for ${symbol.toUpperCase()}: $${price}`,
    });
}

async function handleRemoveOverride(params: { override_type: string; target_id: string }) {
    const { override_type, target_id } = params;

    if (!override_type || !target_id) {
        return NextResponse.json(
            { success: false, error: 'Missing override_type or target_id' },
            { status: 400 }
        );
    }

    const { error } = await supabase
        .from('admin_overrides')
        .update({ active: false })
        .eq('override_type', override_type)
        .eq('target_id', target_id);

    if (error) {
        return NextResponse.json(
            { success: false, error: 'Failed to remove override' },
            { status: 500 }
        );
    }

    return NextResponse.json({
        success: true,
        message: `Override removed for ${override_type}:${target_id}`,
    });
}





export async function GET(request: NextRequest) {
    try {
        if (!verifyAdmin(request)) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { data: overrides } = await supabase
            .from('admin_overrides')
            .select('*')
            .eq('active', true);

        const { count: pendingKYC } = await supabase
            .from('kyc_submissions')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'PENDING');

        const { count: activeLoans } = await supabase
            .from('collateralized_loans')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'ACTIVE');

        const { count: defaultedLoans } = await supabase
            .from('collateralized_loans')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'DEFAULTED');

        return NextResponse.json({
            success: true,
            overrides: overrides || [],
            stats: {
                pending_kyc: pendingKYC || 0,
                active_loans: activeLoans || 0,
                defaulted_loans: defaultedLoans || 0,
            },
        });
    } catch (error) {
        console.error('Admin GET error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch admin data' },
            { status: 500 }
        );
    }
}
