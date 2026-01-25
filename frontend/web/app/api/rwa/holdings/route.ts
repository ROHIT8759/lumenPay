import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export interface RWAHolding {
  id: string;
  user_id: string;
  asset_id: string;
  quantity: number;
  average_buy_price: number;
  total_invested: number;
  total_yield_earned: number;
  pending_yield: number;
  trustline_established: boolean;
  first_purchase_at: string;
  last_transaction_at: string;
  
  asset?: {
    asset_code: string;
    name: string;
    asset_type: string;
    unit_price: number;
    annual_yield_percent: number;
    yield_frequency: string;
    risk_level: string;
    image_url: string | null;
  };
}


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('rwa_holdings')
      .select(`
        *,
        asset:rwa_assets (
          asset_code,
          name,
          asset_type,
          unit_price,
          annual_yield_percent,
          yield_frequency,
          risk_level,
          image_url
        )
      `)
      .eq('user_id', userId)
      .order('last_transaction_at', { ascending: false });

    if (error) {
      console.error('Error fetching holdings:', error);
      return NextResponse.json({ error: 'Failed to fetch holdings' }, { status: 500 });
    }

    
    const holdingsWithValues = (data || []).map(holding => {
      const currentValue = holding.quantity * (holding.asset?.unit_price || holding.average_buy_price);
      const unrealizedGain = currentValue - holding.total_invested;
      const unrealizedGainPercent = (unrealizedGain / holding.total_invested) * 100;

      return {
        ...holding,
        current_value: currentValue,
        unrealized_gain: unrealizedGain,
        unrealized_gain_percent: unrealizedGainPercent.toFixed(2),
      };
    });

    
    const totalInvested = holdingsWithValues.reduce((sum, h) => sum + h.total_invested, 0);
    const totalCurrentValue = holdingsWithValues.reduce((sum, h) => sum + h.current_value, 0);
    const totalYieldEarned = holdingsWithValues.reduce((sum, h) => sum + h.total_yield_earned, 0);
    const totalPendingYield = holdingsWithValues.reduce((sum, h) => sum + h.pending_yield, 0);

    return NextResponse.json({
      success: true,
      holdings: holdingsWithValues,
      portfolio: {
        total_invested: totalInvested,
        current_value: totalCurrentValue,
        total_gain: totalCurrentValue - totalInvested,
        total_gain_percent: totalInvested > 0 
          ? (((totalCurrentValue - totalInvested) / totalInvested) * 100).toFixed(2)
          : '0.00',
        total_yield_earned: totalYieldEarned,
        pending_yield: totalPendingYield,
        holdings_count: holdingsWithValues.length
      }
    });
  } catch (err) {
    console.error('Holdings API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, assetId, limit = 50 } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    let query = supabase
      .from('rwa_transactions')
      .select(`
        *,
        asset:rwa_assets (
          asset_code,
          name,
          asset_type
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (assetId) {
      query = query.eq('asset_id', assetId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching transactions:', error);
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      transactions: data || [],
      count: data?.length || 0
    });
  } catch (err) {
    console.error('Transactions API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
