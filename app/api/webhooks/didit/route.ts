






import { NextRequest, NextResponse } from 'next/server';
import { diditService, DiditWebhookPayload } from '@/lib/diditService';













export async function POST(request: NextRequest) {
    try {
        
        const rawBody = await request.text();
        const signature = request.headers.get('x-didit-signature') || '';

        
        const isValid = diditService.verifyWebhookSignature(rawBody, signature);

        if (!isValid) {
            console.warn('[Webhook/Didit] Invalid signature');
            
            if (process.env.NODE_ENV === 'production') {
                return NextResponse.json(
                    { success: false, error: 'Invalid signature' },
                    { status: 401 }
                );
            }
        }

        
        let payload: DiditWebhookPayload;
        try {
            payload = JSON.parse(rawBody);
        } catch {
            return NextResponse.json(
                { success: false, error: 'Invalid JSON payload' },
                { status: 400 }
            );
        }

        
        if (!payload.session_id || !payload.vendor_data || !payload.status) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        
        const result = await diditService.processWebhookEvent(payload);

        if (!result.success) {
            return NextResponse.json(
                { success: false, error: result.error },
                { status: 500 }
            );
        }

        
        return NextResponse.json({ success: true });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Webhook/Didit] Error:', errorMessage);
        return NextResponse.json(
            { success: false, error: errorMessage },
            { status: 500 }
        );
    }
}





export async function GET() {
    return NextResponse.json({
        status: 'ok',
        service: 'didit-webhook',
        timestamp: new Date().toISOString()
    });
}
