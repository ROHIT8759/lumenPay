

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

export async function GET(request: NextRequest) {
    try {
        
        const authHeader = request.headers.get('authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'No authorization token' },
                { status: 401 }
            );
        }

        const token = authHeader.substring(7); 

        
        try {
            const { payload } = await jwtVerify(token, JWT_SECRET);

            return NextResponse.json({
                address: payload.address,
                expiresAt: (payload.exp || 0) * 1000, 
            });
        } catch (error) {
            return NextResponse.json(
                { error: 'Invalid or expired token' },
                { status: 401 }
            );
        }
    } catch (error: any) {
        console.error('Session check error:', error);
        return NextResponse.json(
            { error: 'Failed to check session' },
            { status: 500 }
        );
    }
}
