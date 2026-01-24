

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const DEMO_MODE = process.env.KYC_DEMO_MODE === 'true';

interface KYCSubmitRequest {
    wallet_address: string;
    full_name: string;
    dob: string; 
    country: string;
    document_type: 'PAN' | 'AADHAAR' | 'PASSPORT' | 'DRIVERS_LICENSE' | 'NATIONAL_ID';
    document_number: string;
    requested_level?: 'KYC_1' | 'KYC_2';
}

export async function POST(request: NextRequest) {
    try {
        const body: KYCSubmitRequest = await request.json();

        
        const requiredFields = ['wallet_address', 'full_name', 'dob', 'country', 'document_type', 'document_number'];
        const missingFields = requiredFields.filter(field => !body[field as keyof KYCSubmitRequest]);

        if (missingFields.length > 0) {
            return NextResponse.json(
                { success: false, error: `Missing required fields: ${missingFields.join(', ')}` },
                { status: 400 }
            );
        }

        
        if (!body.wallet_address.startsWith('G') || body.wallet_address.length !== 56) {
            return NextResponse.json(
                { success: false, error: 'Invalid Stellar wallet address' },
                { status: 400 }
            );
        }

        
        const dob = new Date(body.dob);
        if (isNaN(dob.getTime())) {
            return NextResponse.json(
                { success: false, error: 'Invalid date of birth format. Use YYYY-MM-DD' },
                { status: 400 }
            );
        }

        
        const today = new Date();
        const age = today.getFullYear() - dob.getFullYear();
        if (age < 18) {
            return NextResponse.json(
                { success: false, error: 'Must be at least 18 years old' },
                { status: 400 }
            );
        }

        
        const { data: existing } = await supabase
            .from('kyc_submissions')
            .select('*')
            .eq('wallet_address', body.wallet_address)
            .single();

        if (existing) {
            
            const requestedLevel = body.requested_level || (existing.kyc_level === 'KYC_0' ? 'KYC_1' : 'KYC_2');

            const updateData: any = {
                full_name: body.full_name,
                dob: body.dob,
                country: body.country,
                document_type: body.document_type,
                document_number: body.document_number,
                updated_at: new Date().toISOString(),
            };

            
            if (DEMO_MODE) {
                updateData.status = 'VERIFIED';
                updateData.kyc_level = requestedLevel;
                updateData.verified_at = new Date().toISOString();
            } else {
                updateData.status = 'PENDING';
            }

            const { data, error } = await supabase
                .from('kyc_submissions')
                .update(updateData)
                .eq('wallet_address', body.wallet_address)
                .select()
                .single();

            if (error) {
                console.error('Error updating KYC:', error);
                return NextResponse.json(
                    { success: false, error: 'Failed to update KYC submission' },
                    { status: 500 }
                );
            }

            return NextResponse.json({
                success: true,
                message: DEMO_MODE ? 'KYC verified (demo mode)' : 'KYC submission updated',
                kyc_level: data.kyc_level,
                status: data.status,
            });
        }

        
        const requestedLevel = body.requested_level || 'KYC_1';

        const insertData: any = {
            wallet_address: body.wallet_address,
            full_name: body.full_name,
            dob: body.dob,
            country: body.country,
            document_type: body.document_type,
            document_number: body.document_number,
            kyc_level: DEMO_MODE ? requestedLevel : 'KYC_0',
            status: DEMO_MODE ? 'VERIFIED' : 'PENDING',
        };

        if (DEMO_MODE) {
            insertData.verified_at = new Date().toISOString();
        }

        const { data, error } = await supabase
            .from('kyc_submissions')
            .insert(insertData)
            .select()
            .single();

        if (error) {
            console.error('Error creating KYC:', error);
            return NextResponse.json(
                { success: false, error: 'Failed to create KYC submission' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: DEMO_MODE ? 'KYC verified (demo mode)' : 'KYC submission received',
            kyc_level: data.kyc_level,
            status: data.status,
        });

    } catch (error) {
        console.error('KYC submit error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
