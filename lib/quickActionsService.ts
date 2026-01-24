import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { Networks, Horizon } from "@stellar/stellar-sdk";
import { walletService } from "./walletService";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const NETWORK_PASSPHRASE = Networks.TESTNET;
const SERVER_URL = "https://horizon-testnet.stellar.org";
const server = new Horizon.Server(SERVER_URL);





// Custodial key decryption removed. All signing happens client-side via LumenVault.





async function getUser(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  if (!userId) throw new Error("Unauthorized: Missing x-user-id header");

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !data) throw new Error("User not found");
  return data;
}





export async function handleScanQR(request: NextRequest) {
  try {
    const user = await getUser(request);
    const body = await request.json();
    const { action, scannedData, amount } = body;

    if (action === "scan") {

      const isPayId = scannedData.includes("@");
      let recipientAddress: string | null = null;

      if (isPayId) {

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("id")
          .eq("pay_id", scannedData)
          .single();

        if (error || !profile) {
          return NextResponse.json(
            { error: "Pay ID not found" },
            { status: 404 }
          );
        }

        const { data: wallet } = await supabase
          .from("wallets")
          .select("public_key")
          .eq("user_id", profile.id)
          .single();

        recipientAddress = wallet?.public_key || null;
      } else {

        recipientAddress = scannedData;
      }

      if (!recipientAddress) {
        return NextResponse.json(
          { error: "Invalid QR code data" },
          { status: 400 }
        );
      }


      const { data: qrRecord } = await supabase
        .from("qr_scans")
        .insert({
          user_id: user.id,
          scanned_data: scannedData,
          scanned_type: isPayId ? "pay_id" : "wallet_address",
          recipient_address: recipientAddress,
          recipient_pay_id: isPayId ? scannedData : null,
          status: "pending",
        })
        .select()
        .single();

      return NextResponse.json({
        success: true,
        recipientAddress,
        recipientPayId: isPayId ? scannedData : null,
        qrScanId: qrRecord?.id,
      });
    }

    if (action === "confirm") {

      const { qrScanId, recipientAddress, amountXLM, signedXdr } = body;

      if (!recipientAddress || !amountXLM) {
        return NextResponse.json(
          { error: "Missing recipient or amount" },
          { status: 400 }
        );
      }


      if (!signedXdr) {
        return NextResponse.json(
          { error: "Missing signedXdr" },
          { status: 400 }
        );
      }

      try {
        const submit = await walletService.submitSignedTransaction(signedXdr);
        if (!submit.success) {
          return NextResponse.json(
            { error: submit.error || "Submission failed" },
            { status: 400 }
          );
        }


        const { data: transaction } = await supabase
          .from("transactions")
          .insert({
            user_id: user.id,
            from_address: wallet.public_key,
            to_address: recipientAddress,
            amount: Math.floor(parseFloat(amountXLM) * 10000000),
            asset_code: "XLM",
            status: "confirmed",
            stellar_tx_hash: submit.txHash,
            type: "payment",
            memo: `QR Payment via LumenPay`,
          })
          .select()
          .single();


        if (qrScanId) {
          await supabase
            .from("qr_scans")
            .update({
              status: "transaction_completed",
              stellar_tx_hash: submit.txHash,
            })
            .eq("id", qrScanId);
        }

        return NextResponse.json({
          success: true,
          txHash: submit.txHash,
          transaction,
        });
      } catch (error: any) {
        console.error("Stellar transaction error:", error);
        return NextResponse.json(
          { error: error.message || "Transaction failed" },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}





export async function handlePayId(request: NextRequest) {
  try {
    const user = await getUser(request);
    const body = await request.json();
    const { action, recipient, amount } = body;

    if (action === "resolve") {

      let recipientData: any = null;
      const isPayId = recipient.includes("@");

      if (isPayId) {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("id, pay_id")
          .eq("pay_id", recipient)
          .single();

        if (error || !profile) {
          return NextResponse.json(
            { error: "Pay ID not found" },
            { status: 404 }
          );
        }

        const { data: wallet } = await supabase
          .from("wallets")
          .select("public_key")
          .eq("user_id", profile.id)
          .single();

        recipientData = {
          payId: profile.pay_id,
          address: wallet?.public_key,
          type: "pay_id",
        };
      } else {

        if (!recipient.startsWith("G") || recipient.length !== 56) {
          return NextResponse.json(
            { error: "Invalid Stellar address" },
            { status: 400 }
          );
        }
        recipientData = {
          address: recipient,
          type: "address",
        };
      }

      return NextResponse.json({
        success: true,
        recipient: recipientData,
      });
    }

    if (action === "send") {

      const { recipientAddress, amountXLM, signedXdr } = body;

      if (!recipientAddress || !amountXLM) {
        return NextResponse.json(
          { error: "Missing recipient or amount" },
          { status: 400 }
        );
      }


      if (!signedXdr) {
        return NextResponse.json(
          { error: "Missing signedXdr" },
          { status: 400 }
        );
      }

      try {
        const submit = await walletService.submitSignedTransaction(signedXdr);
        if (!submit.success) {
          return NextResponse.json(
            { error: submit.error || "Submission failed" },
            { status: 400 }
          );
        }

        await supabase.from("transactions").insert({
          user_id: user.id,
          to_address: recipientAddress,
          amount: Math.floor(parseFloat(amountXLM) * 10000000),
          asset_code: "XLM",
          status: "confirmed",
          stellar_tx_hash: submit.txHash,
          type: "payment",
          memo: `Pay ID Transfer`,
        });

        return NextResponse.json({
          success: true,
          txHash: submit.txHash,
        });
      } catch (error: any) {
        return NextResponse.json(
          { error: error.message || "Transaction failed" },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}





export async function handleBankPayout(request: NextRequest) {
  try {
    const user = await getUser(request);
    const body = await request.json();
    const { action, recipientName, bankIdentifier, amountUSCToops } = body;

    if (action === "initiate") {
      if (!recipientName || !bankIdentifier || !amountUSCToops) {
        return NextResponse.json(
          { error: "Missing required fields" },
          { status: 400 }
        );
      }


      const referenceId = `BP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;


      const { data: payout, error } = await supabase
        .from("bank_payouts")
        .insert({
          user_id: user.id,
          recipient_name: recipientName,
          bank_identifier: bankIdentifier,
          amount_usdc: amountUSCToops,
          bank_identifier_type: bankIdentifier.includes("@") ? "upi_id" : "account_number",
          status: "pending",
          reference_id: referenceId,
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          { error: "Failed to create payout" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        payoutId: payout.id,
        referenceId: referenceId,
        status: "pending",
        message: "Payout initiated. Processing...",
      });
    }

    if (action === "confirm") {
      const { payoutId } = body;


      const { error: updateError } = await supabase
        .from("bank_payouts")
        .update({ status: "processing" })
        .eq("id", payoutId)
        .eq("user_id", user.id);

      if (updateError) {
        return NextResponse.json(
          { error: "Failed to process payout" },
          { status: 500 }
        );
      }



      setTimeout(async () => {
        await supabase
          .from("bank_payouts")
          .update({ status: "completed" })
          .eq("id", payoutId);
      }, 2000);

      return NextResponse.json({
        success: true,
        status: "processing",
        message: "Payout processing. You will receive confirmation within 1-3 business days.",
      });
    }

    if (action === "status") {
      const { payoutId } = body;

      const { data: payout } = await supabase
        .from("bank_payouts")
        .select("*")
        .eq("id", payoutId)
        .eq("user_id", user.id)
        .single();

      return NextResponse.json({
        success: true,
        payout,
      });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}





export async function handleAssetTrade(request: NextRequest) {
  try {
    const user = await getUser(request);
    const body = await request.json();
    const { action, assetId, quantity, type } = body;

    if (action === "fetch_assets") {

      const { data: assets, error } = await supabase
        .from("crypto_assets")
        .select("*")
        .eq("is_active", true)
        .order("market_cap_rank", { ascending: true })
        .limit(40);

      if (error) {
        return NextResponse.json(
          { error: "Failed to fetch assets" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        assets,
      });
    }

    if (action === "get_balance") {

      const { data: balances, error } = await supabase
        .from("asset_balances")
        .select("*, crypto_assets(*)")
        .eq("user_id", user.id);

      if (error) {
        return NextResponse.json(
          { error: "Failed to fetch balances" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        balances,
      });
    }

    if (action === "buy" || action === "sell") {
      if (!assetId || !quantity) {
        return NextResponse.json(
          { error: "Missing asset or quantity" },
          { status: 400 }
        );
      }


      const { data: asset, error: assetError } = await supabase
        .from("crypto_assets")
        .select("*")
        .eq("id", assetId)
        .single();

      if (assetError || !asset) {
        return NextResponse.json(
          { error: "Asset not found" },
          { status: 404 }
        );
      }

      const totalUSD = parseFloat(quantity) * parseFloat(asset.price_usd);

      if (action === "buy") {

        const { data: wallet } = await supabase
          .from("wallets")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (!wallet) {
          return NextResponse.json(
            { error: "Wallet not found" },
            { status: 404 }
          );
        }


        const { data: trade, error: tradeError } = await supabase
          .from("trades")
          .insert({
            user_id: user.id,
            asset_id: assetId,
            type: "buy",
            quantity: parseFloat(quantity),
            price_usd: parseFloat(asset.price_usd),
            total_usd: totalUSD,
            usdc_debited: Math.floor(totalUSD * 10000000),
            status: "executed",
            order_id: `ORD-${Date.now()}`,
          })
          .select()
          .single();

        if (tradeError) {
          return NextResponse.json(
            { error: "Failed to create trade" },
            { status: 500 }
          );
        }


        const { data: existingBalance } = await supabase
          .from("asset_balances")
          .select("*")
          .eq("user_id", user.id)
          .eq("asset_id", assetId)
          .single();

        if (existingBalance) {
          await supabase
            .from("asset_balances")
            .update({
              balance: (parseFloat(existingBalance.balance) + parseFloat(quantity)).toString(),
            })
            .eq("id", existingBalance.id);
        } else {
          await supabase
            .from("asset_balances")
            .insert({
              user_id: user.id,
              asset_id: assetId,
              balance: parseFloat(quantity),
            });
        }

        return NextResponse.json({
          success: true,
          trade,
          message: `Successfully bought ${quantity} ${asset.symbol}`,
        });
      }

      if (action === "sell") {

        const { data: balance, error: balanceError } = await supabase
          .from("asset_balances")
          .select("*")
          .eq("user_id", user.id)
          .eq("asset_id", assetId)
          .single();

        if (balanceError || !balance) {
          return NextResponse.json(
            { error: "Insufficient asset balance" },
            { status: 400 }
          );
        }

        if (parseFloat(balance.balance) < parseFloat(quantity)) {
          return NextResponse.json(
            { error: "Insufficient balance for sell" },
            { status: 400 }
          );
        }


        const { data: trade, error: tradeError } = await supabase
          .from("trades")
          .insert({
            user_id: user.id,
            asset_id: assetId,
            type: "sell",
            quantity: parseFloat(quantity),
            price_usd: parseFloat(asset.price_usd),
            total_usd: totalUSD,
            usdc_debited: 0,
            status: "executed",
            order_id: `ORD-${Date.now()}`,
          })
          .select()
          .single();

        if (tradeError) {
          return NextResponse.json(
            { error: "Failed to create trade" },
            { status: 500 }
          );
        }


        await supabase
          .from("asset_balances")
          .update({
            balance: (parseFloat(balance.balance) - parseFloat(quantity)).toString(),
          })
          .eq("id", balance.id);

        return NextResponse.json({
          success: true,
          trade,
          usdcReceived: totalUSD,
          message: `Successfully sold ${quantity} ${asset.symbol}`,
        });
      }
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
