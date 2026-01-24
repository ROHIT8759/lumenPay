










import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface KYCCheckResult {
    isVerified: boolean;
    level: number;
    status: string;
}




export async function checkKYCStatus(walletAddress: string): Promise<KYCCheckResult> {
    try {
        const { data, error } = await supabase
            .from('kyc_status')
            .select('is_verified, verification_level, status')
            .eq('user_id', walletAddress)
            .single();

        if (error || !data) {
            return {
                isVerified: false,
                level: 0,
                status: 'NOT_STARTED'
            };
        }

        return {
            isVerified: data.is_verified === true,
            level: data.verification_level || 0,
            status: data.status || 'NOT_STARTED'
        };

    } catch {
        return {
            isVerified: false,
            level: 0,
            status: 'ERROR'
        };
    }
}




export async function requireKYCLevel1(
    request: NextRequest,
    walletAddress: string
): Promise<NextResponse | null> {
    const kycStatus = await checkKYCStatus(walletAddress);

    if (!kycStatus.isVerified || kycStatus.level < 1) {
        return NextResponse.json(
            {
                error: 'KYC verification required',
                code: 'KYC_REQUIRED',
                requiredLevel: 1,
                currentLevel: kycStatus.level,
                message: 'Please complete identity verification to access this feature.'
            },
            { status: 403 }
        );
    }

    return null; 
}





export async function requireKYCLevel2(
    request: NextRequest,
    walletAddress: string
): Promise<NextResponse | null> {
    const kycStatus = await checkKYCStatus(walletAddress);

    if (!kycStatus.isVerified || kycStatus.level < 2) {
        return NextResponse.json(
            {
                error: 'Extended KYC verification required',
                code: 'EXTENDED_KYC_REQUIRED',
                requiredLevel: 2,
                currentLevel: kycStatus.level,
                message: 'Please complete extended verification to access this feature.'
            },
            { status: 403 }
        );
    }

    return null; 
}




export function getTransactionLimit(kycLevel: number): number {
    const limits = {
        0: 1000,       
        1: 50000,      
        2: 500000,     
    };

    return limits[kycLevel as keyof typeof limits] || limits[0];
}




export async function checkTransactionLimit(
    walletAddress: string,
    amountUSD: number
): Promise<{ allowed: boolean; limit: number; requiredLevel?: number }> {
    const kycStatus = await checkKYCStatus(walletAddress);
    const currentLimit = getTransactionLimit(kycStatus.level);

    if (amountUSD > currentLimit) {
        
        let requiredLevel = 1;
        if (amountUSD > getTransactionLimit(1)) {
            requiredLevel = 2;
        }

        return {
            allowed: false,
            limit: currentLimit,
            requiredLevel
        };
    }

    return {
        allowed: true,
        limit: currentLimit
    };
}
