import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { MOCK_LOANS } from '@/lib/mockData';

export interface CollateralLoan {
  id: string;
  user_id: string;
  loan_type: 'collateral' | 'flash';
  principal_amount: number;
  loan_amount: number;
  interest_rate_bps: number;
  tenure_days: number;
  amount_repaid: number;
  amount_outstanding: number;
  interest_accrued: number;
  status: 'pending' | 'active' | 'repaid' | 'defaulted' | 'liquidated' | 'cancelled';
  ltv_ratio: number | null;
  liquidation_threshold: number;
  requested_at: string;
  disbursed_at: string | null;
  due_date: string | null;
  collateral?: LoanCollateral[];
}

export interface LoanCollateral {
  id: string;
  collateral_type: 'usdc' | 'xlm' | 'rwa';
  asset_code: string;
  amount: number;
  value_at_deposit: number;
  current_value: number | null;
  is_locked: boolean;
}


const ASSET_PRICES: Record<string, number> = {
  'USDC': 1.00,
  'XLM': 0.12,
  'REALTY01': 100.00,
  'TBOND01': 1000.00,
  'GOLD01': 65.00,
};


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');




    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    let query = supabase
      .from('loans')
      .select(`
        *,
        collateral:loan_collateral (*)
      `)
      .eq('user_id', userId)
      .eq('loan_type', 'collateral')
      .order('requested_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching loans:', error);
      return NextResponse.json({ error: 'Failed to fetch loans' }, { status: 500 });
    }


    const activeLoans = (data || []).filter(l => l.status === 'active');
    const totalBorrowed = activeLoans.reduce((sum, l) => sum + l.principal_amount, 0);
    const totalOutstanding = activeLoans.reduce((sum, l) => sum + l.amount_outstanding, 0);
    const totalCollateralValue = activeLoans.reduce((sum, l) => {
      const collateralSum = (l.collateral || []).reduce(
        (cs: number, c: LoanCollateral) => cs + (c.current_value || c.value_at_deposit),
        0
      );
      return sum + collateralSum;
    }, 0);

    const healthFactor = totalOutstanding > 0
      ? (totalCollateralValue / totalOutstanding)
      : 999;

    return NextResponse.json({
      success: true,
      loans: data as CollateralLoan[],
      summary: {
        active_loans: activeLoans.length,
        total_borrowed: totalBorrowed,
        total_outstanding: totalOutstanding,
        total_collateral: totalCollateralValue,
        health_factor: healthFactor.toFixed(2),
        is_healthy: healthFactor > 1.25,
      }
    });
  } catch (err) {
    console.error('Collateral loans API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      principalAmount,
      tenureDays,
      collateral
    } = body;


    if (!userId || !principalAmount || !tenureDays) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!collateral || collateral.length === 0) {
      return NextResponse.json({ error: 'Collateral required' }, { status: 400 });
    }

    if (principalAmount < 10) {
      return NextResponse.json({ error: 'Minimum loan amount is $10' }, { status: 400 });
    }


    let totalCollateralValue = 0;
    for (const c of collateral) {
      const price = ASSET_PRICES[c.assetCode] || 1;
      totalCollateralValue += c.amount * price;
    }


    const ltvRatio = (principalAmount / totalCollateralValue) * 100;
    if (ltvRatio > 70) {
      const requiredCollateral = principalAmount / 0.7;
      return NextResponse.json({
        error: 'Insufficient collateral. Maximum LTV is 70%',
        details: {
          required_collateral_value: requiredCollateral.toFixed(2),
          current_collateral_value: totalCollateralValue.toFixed(2),
          current_ltv: ltvRatio.toFixed(2),
          max_borrowable: (totalCollateralValue * 0.7).toFixed(2),
        }
      }, { status: 400 });
    }


    if (principalAmount > 10000) {
      const { data: kycData } = await supabase
        .from('kyc_status')
        .select('verification_level, is_verified')
        .eq('user_id', userId)
        .single();

      if (!kycData?.is_verified || (kycData.verification_level || 0) < 2) {
        return NextResponse.json({
          error: 'Full KYC required for loans above $10,000',
          kyc_required: true,
          required_level: 2
        }, { status: 403 });
      }
    }



    let interestRateBps = 1000;
    if (ltvRatio > 40) {
      interestRateBps += Math.floor((ltvRatio - 40) / 10) * 200;
    }

    interestRateBps = Math.min(interestRateBps, 2500);


    const originationFee = principalAmount * 0.005;
    const loanAmount = principalAmount - originationFee;


    const interestAmount = principalAmount * (interestRateBps / 10000) * (tenureDays / 365);
    const amountOutstanding = principalAmount + interestAmount;


    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + tenureDays);


    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .insert({
        user_id: userId,
        loan_type: 'collateral',
        principal_amount: principalAmount,
        loan_amount: loanAmount,
        interest_rate_bps: interestRateBps,
        tenure_days: tenureDays,
        amount_outstanding: amountOutstanding,
        status: 'pending',
        ltv_ratio: ltvRatio,
        liquidation_threshold: 80,
        due_date: dueDate.toISOString(),
      })
      .select()
      .single();

    if (loanError) {
      console.error('Failed to create loan:', loanError);
      return NextResponse.json({ error: 'Failed to create loan' }, { status: 500 });
    }


    const collateralRecords = collateral.map((c: { assetCode: string; amount: number }) => ({
      loan_id: loan.id,
      user_id: userId,
      collateral_type: c.assetCode === 'XLM' ? 'xlm' : (c.assetCode === 'USDC' ? 'usdc' : 'rwa'),
      asset_code: c.assetCode,
      amount: c.amount,
      value_at_deposit: c.amount * (ASSET_PRICES[c.assetCode] || 1),
      current_value: c.amount * (ASSET_PRICES[c.assetCode] || 1),
      is_locked: true,
    }));

    const { error: collateralError } = await supabase.from('loan_collateral').insert(collateralRecords);

    if (collateralError) {
      console.error('Failed to lock collateral:', collateralError);

      await supabase.from('loans').delete().eq('id', loan.id);
      return NextResponse.json({ error: 'Failed to lock collateral' }, { status: 500 });
    }


    await supabase
      .from('loans')
      .update({
        status: 'active',
        disbursed_at: new Date().toISOString(),
      })
      .eq('id', loan.id);


    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', userId)
      .single();

    if (wallet) {
      await supabase
        .from('wallets')
        .update({ balance: wallet.balance + loanAmount })
        .eq('user_id', userId);
    }

    return NextResponse.json({
      success: true,
      message: 'Loan approved and disbursed',
      loan: {
        id: loan.id,
        principal_amount: principalAmount,
        loan_amount: loanAmount,
        origination_fee: originationFee,
        interest_rate: `${(interestRateBps / 100).toFixed(2)}%`,
        tenure_days: tenureDays,
        amount_to_repay: amountOutstanding.toFixed(2),
        due_date: dueDate.toISOString(),
        ltv_ratio: ltvRatio.toFixed(2),
        collateral_locked: totalCollateralValue.toFixed(2),
      }
    });

  } catch (err) {
    console.error('Loan request API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
