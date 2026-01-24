






import { NextRequest, NextResponse } from 'next/server';
import { diditService } from '@/lib/diditService';



















export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { wallet_address, reference_image_url } = body;

        
        if (!wallet_address || typeof wallet_address !== 'string') {
            return NextResponse.json(
                { success: false, error: 'wallet_address is required' },
                { status: 400 }
            );
        }

        
        if (!wallet_address.startsWith('G') || wallet_address.length !== 56) {
            return NextResponse.json(
                { success: false, error: 'Invalid Stellar wallet address format' },
                { status: 400 }
            );
        }

        
        const result = await diditService.createSession(wallet_address, reference_image_url);

        if (!result.success) {
            return NextResponse.json(
                { success: false, error: result.error },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            verification_url: result.verification_url,
            session_id: result.session_id
        });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[KYC/Didit] POST error:', errorMessage);
        return NextResponse.json(
            { success: false, error: errorMessage },
            { status: 500 }
        );
    }
}








export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const walletAddress = searchParams.get('wallet_address');
        const sessionId = searchParams.get('session_id');

        if (!walletAddress && !sessionId) {
            return NextResponse.json(
                { success: false, error: 'wallet_address or session_id is required' },
                { status: 400 }
            );
        }

        
        if (sessionId) {
            const result = await diditService.getSessionStatus(sessionId);
            return NextResponse.json(result);
        }

        
        if (walletAddress) {
            const result = await diditService.getKYCStatus(walletAddress);
            return NextResponse.json(result);
        }

        return NextResponse.json(
            { success: false, error: 'Invalid request' },
            { status: 400 }
        );

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[KYC/Didit] GET error:', errorMessage);
        return NextResponse.json(
            { success: false, error: errorMessage },
            { status: 500 }
        );
    }
}
