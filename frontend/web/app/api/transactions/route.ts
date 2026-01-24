import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);


export async function GET(request: NextRequest) {
  try {
    
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "20");
    const offset = parseInt(request.nextUrl.searchParams.get("offset") || "0");
    const statusFilter = request.nextUrl.searchParams.get("status");

    
    let query = supabase
      .from("transactions")
      .select(`
        id,
        tx_hash,
        tx_type,
        tx_direction,
        amount,
        asset_code,
        sender_wallet,
        sender_display_name,
        receiver_wallet,
        receiver_display_name,
        recipient_name,
        recipient_address,
        pay_id_used,
        memo,
        reference,
        status,
        error_message,
        fee,
        related_feature,
        meta_data,
        created_at,
        confirmed_at
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    
    if (statusFilter) {
      query = query.eq("status", statusFilter);
    }

    const { data: transactions, error } = await query;

    if (error) {
      console.error("Error fetching transactions:", error);
      return NextResponse.json(
        { error: "Failed to fetch transactions" },
        { status: 500 }
      );
    }

    
    const { count } = await supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    return NextResponse.json({
      transactions: transactions || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error("Transaction API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
