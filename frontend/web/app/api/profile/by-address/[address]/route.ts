import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);


export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const address = params.address;
    
    if (!address) {
      return NextResponse.json({ error: "Address is required" }, { status: 400 });
    }

    
    const { data: wallet, error: walletError } = await supabase
      .from("wallets")
      .select("user_id")
      .eq("public_key", address)
      .single();

    if (walletError || !wallet) {
      
      return NextResponse.json({
        profile: {
          address,
          shortAddress: `${address.slice(0, 4)}...${address.slice(-4)}`,
          displayName: null,
          payId: null,
          avatarUrl: null,
        }
      });
    }

    
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("display_name, full_name, avatar_url, pay_id")
      .eq("id", wallet.user_id)
      .single();

    if (profileError) {
      return NextResponse.json({
        profile: {
          address,
          shortAddress: `${address.slice(0, 4)}...${address.slice(-4)}`,
          displayName: null,
          payId: null,
          avatarUrl: null,
        }
      });
    }

    return NextResponse.json({
      profile: {
        address,
        shortAddress: `${address.slice(0, 4)}...${address.slice(-4)}`,
        displayName: profile.display_name || profile.full_name,
        payId: profile.pay_id,
        avatarUrl: profile.avatar_url,
      }
    });
  } catch (error: any) {
    console.error("Error fetching profile by address:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
