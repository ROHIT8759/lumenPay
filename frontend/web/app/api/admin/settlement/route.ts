
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'demo-admin-secret';


const MOCK_FX_RATES: Record<string, number> = {
    XLM: 10.50,
    USDC: 83.50,
    EURC: 90.00,
};


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
        const { action, paymentId, txHash } = body;

        switch (action) {
            case 'simulate_settlement':
                return await simulateSettlement(paymentId);

            case 'force_success':
                return await forceStatus(paymentId, 'success');

            case 'force_failure':
                return await forceStatus(paymentId, 'failed', body.errorMessage);

            case 'get_fx_rate':
                return await getFxRate(body.assetCode);

            case 'override_fx':
                return await overrideFxRate(body.assetCode, body.rate);

            default:
                return NextResponse.json(
                    { error: 'Invalid action' },
                    { status: 400 }
                );
        }
    } catch (error: any) {
        console.error('Settlement simulator error:', error);
        return NextResponse.json(
            { error: error.message || 'Settlement simulation failed' },
            { status: 500 }
        );
    }
}


async function simulateSettlement(paymentId: string) {
    if (!paymentId) {
        return NextResponse.json(
            { error: 'Missing paymentId' },
            { status: 400 }
        );
    }

    const { data: payment, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', paymentId)
        .single();

    if (error || !payment) {
        return NextResponse.json(
            { error: 'Payment not found' },
            { status: 404 }
        );
    }

    const assetCode = payment.asset_code || 'XLM';
    const fxRate = MOCK_FX_RATES[assetCode] || 83.50;
    const amountCrypto = parseFloat(payment.amount) || 0;
    const amountINR = amountCrypto * fxRate;

    await new Promise(resolve => setTimeout(resolve, 1500));

    const settlementRecord = {
        payment_id: paymentId,
        crypto_amount: amountCrypto,
        crypto_asset: assetCode,
        fx_rate: fxRate,
        fiat_amount: amountINR,
        fiat_currency: 'INR',
        settled_at: new Date().toISOString(),
        upi_reference: `UPI${Date.now()}`,
    };

    await supabase.from('settlements').insert(settlementRecord);

    await supabase
        .from('transactions')
        .update({
            status: 'settled',
            meta_data: {
                ...(payment.meta_data || {}),
                settlement: settlementRecord,
            },
        })
        .eq('id', paymentId);

    return NextResponse.json({
        success: true,
        settlement: settlementRecord,
        message: 'Settlement simulated successfully',
    });
}


async function forceStatus(paymentId: string, status: string, errorMessage?: string) {
    if (!paymentId) {
        return NextResponse.json(
            { error: 'Missing paymentId' },
            { status: 400 }
        );
    }

    const updateData: any = {
        status,
        confirmed_at: status === 'success' ? new Date().toISOString() : null,
    };

    if (errorMessage) {
        updateData.error_message = errorMessage;
    }

    const { error } = await supabase
        .from('transactions')
        .update(updateData)
        .eq('id', paymentId);

    if (error) {
        return NextResponse.json(
            { error: 'Failed to update payment status' },
            { status: 500 }
        );
    }

    return NextResponse.json({
        success: true,
        paymentId,
        newStatus: status,
    });
}


async function getFxRate(assetCode: string) {
    const rate = MOCK_FX_RATES[assetCode] || MOCK_FX_RATES['USDC'];

    return NextResponse.json({
        assetCode,
        rate,
        currency: 'INR',
        source: 'mock',
        timestamp: new Date().toISOString(),
    });
}


async function overrideFxRate(assetCode: string, rate: number) {
    if (!assetCode || !rate) {
        return NextResponse.json(
            { error: 'Missing assetCode or rate' },
            { status: 400 }
        );
    }

    MOCK_FX_RATES[assetCode] = rate;

    return NextResponse.json({
        success: true,
        assetCode,
        newRate: rate,
    });
}
