import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { personId: string } }
) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const personAddress = params.personId; 
    if (!personAddress) {
      return NextResponse.json({ error: "Person ID required" }, { status: 400 });
    }

    
    const { data: userWallet, error: walletError } = await supabase
      .from("wallets")
      .select("public_key")
      .eq("user_id", userId)
      .single();

    if (walletError || !userWallet) {
      return NextResponse.json({ error: "User wallet not found" }, { status: 404 });
    }

    const userAddress = userWallet.public_key;

    
    const { data: contactData } = await supabase
      .from("contacts")
      .select("contact_name")
      .eq("user_id", userId)
      .eq("contact_address", personAddress)
      .single();

    const customName = contactData?.contact_name || null;

    
    
    
    const { data: transactions, error: txError } = await supabase
      .from("transactions")
      .select(`
        id,
        tx_hash,
        tx_type,
        amount,
        asset_code,
        recipient_address,
        recipient_name,
        sender_address,
        sender_display_name,
        memo,
        status,
        fee,
        meta_data,
        created_at,
        confirmed_at
      `)
      .eq("user_id", userId)
      .in("tx_type", ["payment_out", "payment_in"])
      .order("created_at", { ascending: true }); 

    if (txError) {
      console.error("Error fetching transactions:", txError);
      return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
    }

    
    const filteredTransactions = (transactions || []).filter((tx) => {
      if (tx.tx_type === "payment_out") {
        
        return tx.recipient_address === personAddress;
      } else if (tx.tx_type === "payment_in") {
        
        const senderAddress = tx.sender_address || tx.meta_data?.sender_address || tx.recipient_address;
        return senderAddress === personAddress;
      }
      return false;
    });

    
    const chatTransactions = filteredTransactions.map((tx) => ({
      id: tx.id,
      txHash: tx.tx_hash,
      direction: tx.tx_type === "payment_out" ? "sent" : "received",
      amount: tx.amount,
      assetCode: tx.asset_code || "USDC",
      memo: tx.memo,
      status: tx.status,
      fee: tx.fee || 0,
      createdAt: tx.created_at,
      confirmedAt: tx.confirmed_at,
      senderDisplayName: tx.sender_display_name || null,
    }));

    
    let personInfo: {
      address: string;
      shortAddress: string;
      name: string | null;
      customName: string | null;
      payId: string | null;
      avatarUrl: string | null;
    } = {
      address: personAddress,
      shortAddress: `${personAddress.slice(0, 4)}...${personAddress.slice(-4)}`,
      name: null,
      customName: customName,
      payId: null,
      avatarUrl: null,
    };

    
    const { data: personWallet } = await supabase
      .from("wallets")
      .select("user_id")
      .eq("public_key", personAddress)
      .single();

    if (personWallet?.user_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, display_name, avatar_url, pay_id")
        .eq("id", personWallet.user_id)
        .single();

      if (profile) {
        personInfo.name = profile.display_name || profile.full_name;
        personInfo.avatarUrl = profile.avatar_url;
        personInfo.payId = profile.pay_id;
      }
    }

    return NextResponse.json({
      person: personInfo,
      transactions: chatTransactions,
      totalCount: chatTransactions.length,
    });
  } catch (error: any) {
    console.error("Error in transaction chat API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
