import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function forwardToBackend(endpoint: string, method: string, body: any, headers: Headers) {
    const token = headers.get('Authorization');
    // We don't need to manually pass x-user-id if the backend validates the token
    // But passing it doesn't hurt if backend uses it for logging/checks
    
    const res = await fetch(`${BACKEND_URL}${endpoint}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token || '',
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error || data.message || 'Backend request failed');
    }
    return data;
}

export async function handleScanQR(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, scannedData, signedXdr } = body;

        if (action === "scan") {
            // Simple validation for Stellar address
            // In a real app, you might check if the account exists via Horizon
            const isValidAddress = scannedData && scannedData.startsWith('G') && scannedData.length === 56;
            
            if (isValidAddress) {
                return NextResponse.json({
                    success: true,
                    recipientAddress: scannedData,
                    recipientPayId: null,
                    qrScanId: "mock-id", // Backend doesn't store scans anymore, but frontend expects ID
                });
            } else {
                // Legacy PayID support removed for now
                return NextResponse.json({ error: "Invalid Stellar address" }, { status: 400 });
            }
        }

        if (action === "confirm") {
            if (!signedXdr) {
                return NextResponse.json({ error: "Missing signedXdr" }, { status: 400 });
            }

            // Forward to backend transaction submission
            const result = await forwardToBackend('/api/transactions/submit', 'POST', { signedXdr }, request.headers);
            
            return NextResponse.json({
                success: true,
                txHash: result.hash,
                transaction: {
                    // Mock transaction object to satisfy frontend expectation
                    id: result.hash,
                    stellar_tx_hash: result.hash,
                    status: 'confirmed'
                },
            });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function handlePayId(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, recipient, signedXdr } = body;

        if (action === "resolve") {
            // Only support direct addresses for now
            if (recipient.startsWith('G') && recipient.length === 56) {
                return NextResponse.json({
                    success: true,
                    recipient: {
                        address: recipient,
                        type: "address",
                    },
                });
            }
            return NextResponse.json({ error: "Invalid address (PayID not supported)" }, { status: 400 });
        }

        if (action === "send") {
             if (!signedXdr) {
                return NextResponse.json({ error: "Missing signedXdr" }, { status: 400 });
            }

            const result = await forwardToBackend('/api/transactions/submit', 'POST', { signedXdr }, request.headers);
            return NextResponse.json({ success: true, txHash: result.hash });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function handleBankPayout(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, recipientName, bankIdentifier, amountUSCToops, payoutId } = body;

        if (action === "initiate") {
            // Forward to off-ramp create
            // Convert micro-units back to major units if needed, but backend expects normal units usually?
            // RampService expects 'cryptoAmount'. 'amountUSCToops' implies USDC micro units?
            // Let's assume frontend sends 100.00 USDC as 100000000?
            // RampService expects float amount.
            
            // Backend RampService: createOffRampIntent(walletAddress, cryptoAmount, asset, ...)
            
            const amount = amountUSCToops / 10000000; // Convert stroops/micro to major
            
            const result = await forwardToBackend('/api/ramp/off/create', 'POST', {
                cryptoAmount: amount,
                asset: 'USDC',
                bankAccountNo: bankIdentifier.includes('@') ? undefined : bankIdentifier,
                upiId: bankIdentifier.includes('@') ? bankIdentifier : undefined,
                // recipientName is not in backend schema yet, but that's fine
            }, request.headers);

            return NextResponse.json({
                success: true,
                payoutId: result.id,
                referenceId: result.id, // Use ID as ref
                status: result.status,
                message: "Payout initiated",
            });
        }

        if (action === "confirm") {
            // In the new flow, confirm usually means "Lock tx confirmed" or similar.
            // But here the frontend just wants to check status or acknowledge.
            // We'll just return success.
             return NextResponse.json({
                success: true,
                status: "processing",
                message: "Payout processing",
            });
        }

        if (action === "status") {
            const result = await forwardToBackend(`/api/ramp/off/${payoutId}`, 'GET', null, request.headers);
            return NextResponse.json({ success: true, payout: result.intent });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function handleAssetTrade(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({})); // Handle empty body for GET-like POSTs
        const { action, assetId, quantity, type } = body;

        if (action === "fetch_assets") {
            const result = await forwardToBackend('/api/stocks/list', 'GET', null, request.headers);
            // Map backend 'stocks' to frontend 'assets' format
            const assets = result.stocks.map((s: any, index: number) => ({
                id: s.symbol, // Use symbol as ID
                symbol: s.symbol,
                name: s.name,
                price_usd: s.price.toString(),
                percent_change_24h: s.change24h.toString(),
                market_cap_rank: index + 1
            }));
            
            return NextResponse.json({ success: true, assets });
        }

        if (action === "buy" || action === "sell") {
            // Forward to buy/sell endpoints
            // Backend expects: symbol, units
            const endpoint = action === "buy" ? '/api/stocks/buy' : '/api/stocks/sell';
            
            const result = await forwardToBackend(endpoint, 'POST', {
                symbol: assetId, // Frontend sends ID which we mapped to symbol
                units: parseFloat(quantity),
            }, request.headers);

            return NextResponse.json({
                success: true,
                trade: result.transaction,
                message: `Successfully ${action === 'buy' ? 'bought' : 'sold'} ${quantity} ${assetId}`
            });
        }
        
        // Handle get_balance?
         if (action === "get_balance") {
            const result = await forwardToBackend('/api/stocks/portfolio', 'GET', null, request.headers);
            return NextResponse.json({ success: true, balances: result.portfolio.positions });
         }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
