

import { NextRequest, NextResponse } from 'next/server';
import { walletService } from '@/lib/walletService';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, ...data } = body;

    if (action === 'signup') {
      return await handleSignup(data);
    } else if (action === 'setup-profile') {
      return await handleSetupProfile(data);
    } else {
      return NextResponse.json(
        { error: 'Unknown action' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Auth API error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}


async function handleSignup(data: any) {
  const { email, password, fullName } = data;

  try {
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user?.id;
    if (!userId) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email,
        full_name: fullName
      });

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    
    const walletResult = await walletService.createWallet(userId);
    if (walletResult.error) {
      return NextResponse.json({ error: walletResult.error }, { status: 500 });
    }

    
    const fundResult = await walletService.createStellarAccount(walletResult.publicKey);
    if (!fundResult.success) {
      console.warn('Stellar account creation failed, retrying later:', fundResult.error);
      
    }

    return NextResponse.json({
      success: true,
      userId,
      publicKey: walletResult.publicKey,
      message: 'Signup successful. Wallet created.'
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


async function handleSetupProfile(data: any) {
  const { userId, phoneNumber, countryCode, language } = data;

  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        phone_number: phoneNumber,
        country_code: countryCode || 'IN',
        language: language || 'en',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Profile setup complete'
    });
  } catch (error: any) {
    console.error('Profile setup error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
