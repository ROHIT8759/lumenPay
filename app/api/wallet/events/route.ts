

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jwtVerify } from 'jose';
import { notifyEscrowCreated, notifyEscrowSettled } from '@/lib/telegramService';

const JWT_SECRET = new TextEncoder().encode(
    process.env.WALLET_JWT_SECRET || 'lumenvault-dev-secret-key-change-in-prod'
);

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);


export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { txHash, eventType, data, network = 'testnet' } = body;

        if (!txHash || !eventType) {
            return NextResponse.json(
                { error: 'Missing required fields: txHash, eventType' },
                { status: 400 }
            );
        }

        const { data: existingEvent } = await supabase
            .from('blockchain_events')
            .select('id')
            .eq('tx_hash', txHash)
            .eq('event_type', eventType)
            .single();

        if (existingEvent) {
            return NextResponse.json({
                success: true,
                message: 'Event already indexed',
                eventId: existingEvent.id,
            });
        }

        const { data: newEvent, error } = await supabase
            .from('blockchain_events')
            .insert({
                tx_hash: txHash,
                event_type: eventType,
                event_data: data,
                network,
                indexed_at: new Date().toISOString(),
            })
            .select('id')
            .single();

        if (error) {
            console.error('Event index error:', error);
            return NextResponse.json(
                { error: 'Failed to index event' },
                { status: 500 }
            );
        }

        if (eventType === 'PaymentCreated' && data?.paymentId) {
            await supabase
                .from('transactions')
                .update({
                    status: 'onchain',
                    meta_data: { ...data, blockchain_event_id: newEvent.id },
                })
                .eq('id', data.paymentId);
            if (data?.borrower && data?.amount && data?.asset) {
                await notifyEscrowCreated(data.borrower, String(data.amount), String(data.asset), String(data.recipient || ''), String(txHash));
            }
        }

        if (eventType === 'PaymentSettled' && data?.paymentId) {
            await supabase
                .from('transactions')
                .update({ status: 'settled' })
                .eq('id', data.paymentId);
            if (data?.borrower) {
                await notifyEscrowSettled(data.borrower, String(txHash));
            }
        }

        return NextResponse.json({
            success: true,
            eventId: newEvent.id,
        });
    } catch (error: any) {
        console.error('Event indexer error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to process event' },
            { status: 500 }
        );
    }
}


export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Authorization required' },
                { status: 401 }
            );
        }

        const token = authHeader.substring(7);
        let walletAddress: string;

        try {
            const { payload } = await jwtVerify(token, JWT_SECRET);
            walletAddress = payload.address as string;
        } catch {
            return NextResponse.json(
                { error: 'Invalid or expired token' },
                { status: 401 }
            );
        }

        const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20');
        const eventType = request.nextUrl.searchParams.get('eventType');

        let query = supabase
            .from('blockchain_events')
            .select('*')
            .order('indexed_at', { ascending: false })
            .limit(limit);

        if (eventType) {
            query = query.eq('event_type', eventType);
        }

        const { data: events, error } = await query;

        if (error) {
            return NextResponse.json(
                { error: 'Failed to fetch events' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            events: events || [],
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to fetch events' },
            { status: 500 }
        );
    }
}
