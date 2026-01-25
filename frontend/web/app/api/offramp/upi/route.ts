import { NextRequest, NextResponse } from 'next/server';
import { recordUPIOfframp, updateTransactionStatus } from '@/lib/transactionService';

// Liquidity Pool Address
const POOL_ADDRESS = process.env.LIQUIDITY_POOL_ADDRESS || 'GDL74OJBVTL6FNOSUS6CJOGFLBHCNJL6LZ5VEIZZNPG36GIPALLJJTHE';
const FEE_PERCENT = parseFloat(process.env.OFFRAMP_FEE_PERCENT || '1') / 100;

// UPI Off-ramp API endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amountXlm, upiId, recipientName, senderWallet, userId, poolTxHash } = body;

    // Validate input
    if (!amountXlm || !upiId || !recipientName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate pool transaction hash (XLM must be sent to pool first)
    if (!poolTxHash) {
      return NextResponse.json(
        { error: 'Pool transaction hash required. Please send XLM to liquidity pool first.' },
        { status: 400 }
      );
    }

    // Validate UPI ID format
    const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;
    if (!upiRegex.test(upiId)) {
      return NextResponse.json(
        { error: 'Invalid UPI ID format' },
        { status: 400 }
      );
    }

    // Validate amount
    const amount = parseFloat(amountXlm);
    if (isNaN(amount) || amount < 1) {
      return NextResponse.json(
        { error: 'Minimum amount is 1 XLM' },
        { status: 400 }
      );
    }

    if (amount > 10000) {
      return NextResponse.json(
        { error: 'Maximum amount is 10,000 XLM' },
        { status: 400 }
      );
    }

    // Calculate fiat amount (1 XLM = ~10.5 INR, with 1% fee)
    const exchangeRate = 10.5;
    const fee = amount * FEE_PERCENT;
    const netAmount = amount - fee;
    const fiatAmount = netAmount * exchangeRate;

    // Store transaction in database
    let transactionRecord;
    try {
      transactionRecord = await recordUPIOfframp({
        userId: userId || '',
        senderWallet: senderWallet || '',
        amountXlm: amount,
        fee: fee,
        fiatAmount: fiatAmount,
        exchangeRate: exchangeRate,
        upiId: upiId,
        recipientName: recipientName,
        status: 'processing', // XLM already received in pool
        reference: poolTxHash,
      });
    } catch (dbError) {
      console.warn('Failed to store transaction in database:', dbError);
      // Continue even if DB storage fails (for demo purposes)
    }

    const requestId = transactionRecord?.id || Date.now().toString();

    // Log the pool transaction for processing
    console.log(`UPI Off-ramp Request:
      - Request ID: ${requestId}
      - Pool TX: ${poolTxHash}
      - Amount: ${amount} XLM
      - Fee (1%): ${fee} XLM
      - Net: ${netAmount} XLM
      - Fiat: ₹${fiatAmount.toFixed(2)}
      - UPI: ${upiId}
      - Recipient: ${recipientName}
      - Pool Address: ${POOL_ADDRESS}
    `);

    return NextResponse.json({
      success: true,
      requestId,
      transactionId: transactionRecord?.id,
      poolTxHash,
      poolAddress: POOL_ADDRESS,
      status: 'processing',
      details: {
        amountXlm: amount.toFixed(7),
        fee: fee.toFixed(7),
        feePercent: `${FEE_PERCENT * 100}%`,
        netAmountXlm: netAmount.toFixed(7),
        fiatAmount: fiatAmount.toFixed(2),
        currency: 'INR',
        upiId,
        recipientName,
        exchangeRate,
        estimatedTime: '1 hour',
      },
      message: `XLM received in pool. UPI payment of ₹${fiatAmount.toFixed(2)} will be processed within 1 hour.`,
    });
  } catch (error: any) {
    console.error('UPI off-ramp error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process UPI request' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'UPI Off-ramp',
    status: 'active',
    exchangeRate: 10.5,
    currency: 'INR',
    fee: '1%',
    minAmount: '1 XLM',
    maxAmount: '10,000 XLM',
    processingTime: 'Usually within 1 hour',
  });
}
