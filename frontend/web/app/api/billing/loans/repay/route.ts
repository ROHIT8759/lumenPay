import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, loanId, amount } = body;

    if (!userId || !loanId || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (amount <= 0) {
      return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 });
    }

    
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select(`
        *,
        collateral:loan_collateral (*)
      `)
      .eq('id', loanId)
      .eq('user_id', userId)
      .single();

    if (loanError || !loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    if (loan.status !== 'active') {
      return NextResponse.json({ error: 'Loan is not active' }, { status: 400 });
    }

    
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', userId)
      .single();

    if (!wallet || wallet.balance < amount) {
      return NextResponse.json({ 
        error: 'Insufficient balance',
        available: wallet?.balance || 0,
        required: amount
      }, { status: 400 });
    }

    
    const repaymentAmount = Math.min(amount, loan.amount_outstanding);
    const newAmountRepaid = loan.amount_repaid + repaymentAmount;
    const newAmountOutstanding = loan.amount_outstanding - repaymentAmount;
    const isFullyRepaid = newAmountOutstanding <= 0.01; 

    
    const { error: updateError } = await supabase
      .from('loans')
      .update({
        amount_repaid: newAmountRepaid,
        amount_outstanding: isFullyRepaid ? 0 : newAmountOutstanding,
        status: isFullyRepaid ? 'repaid' : 'active',
        repaid_at: isFullyRepaid ? new Date().toISOString() : null,
      })
      .eq('id', loanId);

    if (updateError) {
      console.error('Failed to update loan:', updateError);
      return NextResponse.json({ error: 'Failed to process repayment' }, { status: 500 });
    }

    
    await supabase
      .from('wallets')
      .update({ balance: wallet.balance - repaymentAmount })
      .eq('user_id', userId);

    
    if (isFullyRepaid && loan.collateral && loan.collateral.length > 0) {
      await supabase
        .from('loan_collateral')
        .update({
          is_locked: false,
          released_at: new Date().toISOString(),
        })
        .eq('loan_id', loanId);

      
      const totalCollateralValue = loan.collateral.reduce(
        (sum: number, c: { current_value: number; value_at_deposit: number }) => 
          sum + (c.current_value || c.value_at_deposit),
        0
      );

      await supabase
        .from('wallets')
        .update({ balance: wallet.balance - repaymentAmount + totalCollateralValue })
        .eq('user_id', userId);
    }

    return NextResponse.json({
      success: true,
      message: isFullyRepaid ? 'Loan fully repaid! Collateral released.' : 'Partial repayment successful',
      repayment: {
        amount_paid: repaymentAmount,
        previous_outstanding: loan.amount_outstanding,
        new_outstanding: isFullyRepaid ? 0 : newAmountOutstanding,
        fully_repaid: isFullyRepaid,
        collateral_released: isFullyRepaid,
      }
    });

  } catch (err) {
    console.error('Loan repayment API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
