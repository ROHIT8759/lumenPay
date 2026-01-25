import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

export interface RWAAsset {
  id: string;
  asset_code: string;
  issuer_address: string;
  asset_type: 'real_estate' | 'bond' | 'commodity' | 'invoice' | 'stable_yield' | 'equity_token';
  name: string;
  description: string;
  detailed_info: Record<string, unknown>;
  image_url: string | null;
  document_urls: string[];
  unit_price: number;
  total_supply: number;
  available_supply: number;
  min_investment: number;
  max_investment: number | null;
  yield_type: 'fixed' | 'variable' | 'none';
  annual_yield_percent: number;
  yield_frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually' | 'none';
  risk_level: 'low' | 'medium' | 'high' | 'very_high';
  requires_kyc: boolean;
  min_kyc_level: number;
  accredited_only: boolean;
  status: 'active' | 'paused' | 'retired' | 'pending';
  is_featured: boolean;
  created_at: string;
}

export async function GET(request: NextRequest) {
  try {
    // Check if Supabase is configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('jsismwafswmoqwfbfswv')) {
      console.warn('Supabase not configured or using invalid URL - returning empty data');
      return NextResponse.json({
        success: true,
        assets: [],
        count: 0,
        message: 'Supabase not configured'
      });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const featured = searchParams.get('featured');
    const riskLevel = searchParams.get('risk');
    const minYield = searchParams.get('minYield');
    const kycLevel = searchParams.get('kycLevel');

    // Require database configuration for production
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        success: false,
        error: 'Database not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
        assets: [],
        count: 0,
      }, { status: 503 });
    }

    let query = supabase
      .from('rwa_assets')
      .select('*')
      .eq('status', 'active')
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('asset_type', type);
    }
    if (featured === 'true') {
      query = query.eq('is_featured', true);
    }
    if (riskLevel) {
      query = query.eq('risk_level', riskLevel);
    }
    if (minYield) {
      query = query.gte('annual_yield_percent', parseFloat(minYield));
    }
    if (kycLevel) {
      query = query.lte('min_kyc_level', parseInt(kycLevel));
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching RWA assets:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch assets',
        assets: [],
        count: 0
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      assets: data as RWAAsset[],
      count: data?.length || 0,
    });
  } catch (err) {
    console.error('RWA assets API error:', err);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      assets: [],
      count: 0
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { assetId } = body;

    if (!assetId) {
      return NextResponse.json({ error: 'Asset ID required' }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        success: false,
        error: 'Database not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
      }, { status: 503 });
    }

    const { data, error } = await supabase
      .from('rwa_assets')
      .select('*')
      .eq('id', assetId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      asset: data as RWAAsset,
    });
  } catch (err) {
    console.error('RWA asset detail API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
