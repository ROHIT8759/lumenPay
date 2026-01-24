import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { MOCK_KYC_STATUS } from '@/lib/mockData';

export interface KYCStatus {
  id: string;
  user_id: string;
  verification_level: number; 
  is_verified: boolean;
  document_verified: boolean;
  address_verified: boolean;
  on_chain_verified: boolean;
  on_chain_tx_hash: string | null;
  submitted_at: string | null;
  verified_at: string | null;
  rejection_reason: string | null;
}


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    
    if (!isSupabaseConfigured()) {
      console.log('[DEMO MODE] Using mock KYC status');
      const kycStatus = { ...MOCK_KYC_STATUS, user_id: userId };
      
      const benefits = {
        max_transaction_limit: kycStatus.verification_level === 0 ? 500 : kycStatus.verification_level === 1 ? 5000 : null,
        max_loan_limit: kycStatus.verification_level === 0 ? 0 : kycStatus.verification_level === 1 ? 10000 : null,
        can_access_rwa: kycStatus.verification_level >= 1,
        can_access_flash_loans: kycStatus.verification_level >= 2,
      };

      return NextResponse.json({
        success: true,
        kyc_status: kycStatus,
        benefits,
        demo: true,
      });
    }

    const { data, error } = await supabase
      .from('kyc_status')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { 
      console.error('Error fetching KYC status:', error);
      return NextResponse.json({ error: 'Failed to fetch KYC status' }, { status: 500 });
    }

    
    const kycStatus: KYCStatus = data || {
      id: '',
      user_id: userId,
      verification_level: 0,
      is_verified: false,
      document_verified: false,
      address_verified: false,
      on_chain_verified: false,
      on_chain_tx_hash: null,
      submitted_at: null,
      verified_at: null,
      rejection_reason: null,
    };

    
    const benefits = {
      level_0: {
        max_transaction: 500,
        max_loan: 0,
        rwa_access: false,
        flash_loans: false,
      },
      level_1: {
        max_transaction: 5000,
        max_loan: 10000,
        rwa_access: true,
        flash_loans: true,
      },
      level_2: {
        max_transaction: 'Unlimited',
        max_loan: 'Unlimited',
        rwa_access: true,
        flash_loans: true,
      },
    };

    return NextResponse.json({
      success: true,
      kyc: kycStatus,
      benefits,
      current_benefits: kycStatus.verification_level === 2 
        ? benefits.level_2 
        : kycStatus.verification_level === 1 
          ? benefits.level_1 
          : benefits.level_0,
    });
  } catch (err) {
    console.error('KYC API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userId, 
      level, 
      
      fullName,
      dateOfBirth,
      nationality,
      
      documentType, 
      documentNumber,
      documentFrontImage, 
      documentBackImage,
      selfieImage,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      proofOfAddressImage,
    } = body;

    if (!userId || !level) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    
    if (level === 1) {
      if (!fullName || !dateOfBirth || !nationality) {
        return NextResponse.json({ error: 'Basic info required for Level 1 KYC' }, { status: 400 });
      }
    }

    if (level === 2) {
      if (!documentType || !documentNumber || !addressLine1 || !city || !country) {
        return NextResponse.json({ error: 'Document and address required for Level 2 KYC' }, { status: 400 });
      }
    }

    
    const { data: existingKyc } = await supabase
      .from('kyc_status')
      .select('id, verification_level')
      .eq('user_id', userId)
      .single();

    
    const verificationData = {
      fullName,
      dateOfBirth,
      nationality,
      documentType: level === 2 ? documentType : undefined,
      documentNumber: level === 2 ? documentNumber?.slice(-4) : undefined, 
      timestamp: Date.now(),
    };
    const verificationHash = Buffer.from(JSON.stringify(verificationData)).toString('base64');

    const kycData = {
      user_id: userId,
      verification_level: level,
      is_verified: true, 
      document_verified: level === 2,
      address_verified: level === 2,
      verification_hash: verificationHash,
      submitted_at: new Date().toISOString(),
      verified_at: new Date().toISOString(), 
    };

    let result;
    if (existingKyc) {
      
      const { data, error } = await supabase
        .from('kyc_status')
        .update(kycData)
        .eq('id', existingKyc.id)
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    } else {
      
      const { data, error } = await supabase
        .from('kyc_status')
        .insert(kycData)
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    }

    
    await supabase
      .from('profiles')
      .update({ kyc_status: level === 2 ? 'verified' : 'basic' })
      .eq('id', userId);

    
    
    

    return NextResponse.json({
      success: true,
      message: `KYC Level ${level} verification submitted`,
      kyc: result,
    });

  } catch (err) {
    console.error('KYC submission error:', err);
    return NextResponse.json({ error: 'Failed to submit KYC' }, { status: 500 });
  }
}
