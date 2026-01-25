import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.WALLET_JWT_SECRET || 'lumenvault-dev-secret-key-change-in-prod'
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Get all transactions from database
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');
    const userId = searchParams.get('userId');
    const txType = searchParams.get('type');
    const status = searchParams.get('status');
    const feature = searchParams.get('feature');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build query
    let query = supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by wallet (sender or receiver)
    if (walletAddress) {
      query = query.or(`sender_wallet.eq.${walletAddress},receiver_wallet.eq.${walletAddress}`);
    }

    // Filter by user ID
    if (userId) {
      query = query.eq('user_id', userId);
    }

    // Filter by transaction type
    if (txType) {
      query = query.eq('tx_type', txType);
    }

    // Filter by status
    if (status) {
      query = query.eq('status', status);
    }

    // Filter by related feature
    if (feature) {
      query = query.eq('related_feature', feature);
    }

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching transactions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch transactions' },
        { status: 500 }
      );
    }

    // Also get total count for pagination
    let countQuery = supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true });

    if (walletAddress) {
      countQuery = countQuery.or(`sender_wallet.eq.${walletAddress},receiver_wallet.eq.${walletAddress}`);
    }
    if (userId) {
      countQuery = countQuery.eq('user_id', userId);
    }
    if (txType) {
      countQuery = countQuery.eq('tx_type', txType);
    }
    if (status) {
      countQuery = countQuery.eq('status', status);
    }
    if (feature) {
      countQuery = countQuery.eq('related_feature', feature);
    }

    const { count: totalCount } = await countQuery;

    return NextResponse.json({
      transactions: data || [],
      pagination: {
        total: totalCount || 0,
        limit,
        offset,
        hasMore: (offset + limit) < (totalCount || 0),
      },
    });
  } catch (error: any) {
    console.error('Transaction history error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch transaction history' },
      { status: 500 }
    );
  }
}

// Get transaction stats
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, walletAddress, userId } = body;

    if (action === 'stats') {
      return await getTransactionStats(walletAddress, userId);
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "stats"' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Transaction stats error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get transaction stats' },
      { status: 500 }
    );
  }
}

async function getTransactionStats(walletAddress?: string, userId?: string) {
  let query = supabase
    .from('transactions')
    .select('tx_type, tx_direction, amount, status, asset_code, fee, created_at');

  if (walletAddress) {
    query = query.or(`sender_wallet.eq.${walletAddress},receiver_wallet.eq.${walletAddress}`);
  }
  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch transaction stats' },
      { status: 500 }
    );
  }

  const transactions = data || [];

  // Calculate stats
  const stats = {
    totalTransactions: transactions.length,
    totalSent: 0,
    totalReceived: 0,
    totalFees: 0,
    pendingCount: 0,
    successCount: 0,
    failedCount: 0,
    byType: {} as Record<string, { count: number; volume: number }>,
    byAsset: {} as Record<string, { sent: number; received: number }>,
    recentActivity: [] as { date: string; count: number }[],
  };

  // Daily activity for last 30 days
  const dailyActivity: Record<string, number> = {};
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  transactions.forEach((tx) => {
    const amount = Number(tx.amount) || 0;
    const fee = Number(tx.fee) || 0;
    const asset = tx.asset_code || 'XLM';

    // Count by status
    if (tx.status === 'pending' || tx.status === 'processing') {
      stats.pendingCount++;
    } else if (tx.status === 'success') {
      stats.successCount++;
    } else if (tx.status === 'failed') {
      stats.failedCount++;
    }

    // Count by type
    if (!stats.byType[tx.tx_type]) {
      stats.byType[tx.tx_type] = { count: 0, volume: 0 };
    }
    stats.byType[tx.tx_type].count++;
    stats.byType[tx.tx_type].volume += amount;

    // Count by asset
    if (!stats.byAsset[asset]) {
      stats.byAsset[asset] = { sent: 0, received: 0 };
    }

    // Calculate sent/received
    if (tx.tx_direction === 'sent' || tx.tx_type.includes('out') || tx.tx_type.includes('payout')) {
      stats.totalSent += amount;
      stats.byAsset[asset].sent += amount;
    } else if (tx.tx_direction === 'received' || tx.tx_type.includes('in') || tx.tx_type === 'topup') {
      stats.totalReceived += amount;
      stats.byAsset[asset].received += amount;
    }

    stats.totalFees += fee;

    // Daily activity
    const txDate = new Date(tx.created_at);
    if (txDate >= thirtyDaysAgo) {
      const dateKey = txDate.toISOString().split('T')[0];
      dailyActivity[dateKey] = (dailyActivity[dateKey] || 0) + 1;
    }
  });

  // Convert daily activity to array
  stats.recentActivity = Object.entries(dailyActivity)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({ stats });
}
