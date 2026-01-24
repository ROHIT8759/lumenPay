import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import * as StellarSdk from '@stellar/stellar-sdk';

interface BuyRWARequest {
  userId: string;
  walletAddress: string;
  walletSecret: string;
  assetId: string;
  quantity: number;
}


export async function POST(request: NextRequest) {
  try {
    const body: BuyRWARequest = await request.json();
    const { userId, walletAddress, walletSecret, assetId, quantity } = body;

    
    if (!userId || !walletAddress || !walletSecret || !assetId || !quantity) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (quantity <= 0) {
      return NextResponse.json({ error: 'Quantity must be positive' }, { status: 400 });
    }

    
    const { data: asset, error: assetError } = await supabase
      .from('rwa_assets')
      .select('*')
      .eq('id', assetId)
      .eq('status', 'active')
      .single();

    if (assetError || !asset) {
      return NextResponse.json({ error: 'Asset not found or inactive' }, { status: 404 });
    }

    
    if (quantity > asset.available_supply) {
      return NextResponse.json({ error: 'Insufficient supply available' }, { status: 400 });
    }

    
    const totalCost = quantity * asset.unit_price;
    if (totalCost < asset.min_investment) {
      return NextResponse.json({
        error: `Minimum investment is ${asset.min_investment} USDC`
      }, { status: 400 });
    }

    
    if (asset.requires_kyc) {
      const { data: kycData } = await supabase
        .from('kyc_status')
        .select('verification_level, is_verified')
        .eq('user_id', userId)
        .single();

      if (!kycData?.is_verified || (kycData.verification_level || 0) < asset.min_kyc_level) {
        return NextResponse.json({
          error: `KYC level ${asset.min_kyc_level} required for this asset`,
          kyc_required: true,
          required_level: asset.min_kyc_level
        }, { status: 403 });
      }
    }

    
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', userId)
      .single();

    if (!wallet || wallet.balance < totalCost) {
      return NextResponse.json({
        error: 'Insufficient USDC balance',
        required: totalCost,
        available: wallet?.balance || 0
      }, { status: 400 });
    }

    
    const { data: txRecord, error: txError } = await supabase
      .from('rwa_transactions')
      .insert({
        user_id: userId,
        asset_id: assetId,
        tx_type: 'buy',
        quantity,
        price_per_unit: asset.unit_price,
        total_amount: totalCost,
        fee: 0,
        status: 'processing'
      })
      .select()
      .single();

    if (txError) {
      console.error('Failed to create transaction record:', txError);
      return NextResponse.json({ error: 'Failed to initiate purchase' }, { status: 500 });
    }

    try {
      
      const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
      const sourceKeypair = StellarSdk.Keypair.fromSecret(walletSecret);

      const account = await server.loadAccount(walletAddress);
      const rwaAsset = new StellarSdk.Asset(asset.asset_code, asset.issuer_address);

      
      const hasTrustline = account.balances.some(
        (b: any) =>
          b.asset_code === asset.asset_code &&
          b.asset_issuer === asset.issuer_address
      );

      let transaction = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET
      });

      
      if (!hasTrustline) {
        transaction = transaction.addOperation(
          StellarSdk.Operation.changeTrust({
            asset: rwaAsset,
            limit: '1000000' 
          })
        );
      }

      
      
      

      const builtTx = transaction
        .setTimeout(30)
        .build();

      builtTx.sign(sourceKeypair);

      const result = await server.submitTransaction(builtTx);

      
      await supabase
        .from('rwa_transactions')
        .update({
          status: 'success',
          stellar_tx_hash: result.hash,
          completed_at: new Date().toISOString()
        })
        .eq('id', txRecord.id);

      
      await supabase
        .from('wallets')
        .update({ balance: wallet.balance - totalCost })
        .eq('user_id', userId);

      
      const { data: existingHolding } = await supabase
        .from('rwa_holdings')
        .select('*')
        .eq('user_id', userId)
        .eq('asset_id', assetId)
        .single();

      if (existingHolding) {
        
        const newQuantity = existingHolding.quantity + quantity;
        const newTotalInvested = existingHolding.total_invested + totalCost;
        const newAvgPrice = newTotalInvested / newQuantity;

        await supabase
          .from('rwa_holdings')
          .update({
            quantity: newQuantity,
            average_buy_price: newAvgPrice,
            total_invested: newTotalInvested,
            last_transaction_at: new Date().toISOString(),
            trustline_established: true,
            trustline_tx_hash: result.hash
          })
          .eq('id', existingHolding.id);
      } else {
        
        await supabase
          .from('rwa_holdings')
          .insert({
            user_id: userId,
            asset_id: assetId,
            quantity,
            average_buy_price: asset.unit_price,
            total_invested: totalCost,
            trustline_established: true,
            trustline_tx_hash: result.hash
          });
      }

      
      await supabase
        .from('rwa_assets')
        .update({ available_supply: asset.available_supply - quantity })
        .eq('id', assetId);

      return NextResponse.json({
        success: true,
        message: 'Purchase successful',
        transaction: {
          id: txRecord.id,
          quantity,
          totalCost,
          stellarTxHash: result.hash
        }
      });

    } catch (stellarError) {
      console.error('Stellar transaction failed:', stellarError);

      
      await supabase
        .from('rwa_transactions')
        .update({
          status: 'failed',
          error_message: stellarError instanceof Error ? stellarError.message : 'Stellar transaction failed'
        })
        .eq('id', txRecord.id);

      return NextResponse.json({
        error: 'Blockchain transaction failed',
        details: stellarError instanceof Error ? stellarError.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (err) {
    console.error('RWA buy API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
