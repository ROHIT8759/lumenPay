import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { action, email, password, firstName, lastName, phone } = await request.json();

    if (action === "signup") {

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (authError) {
        return NextResponse.json({ error: authError.message }, { status: 400 });
      }

      const userId = authData.user.id;


      const { error: profileError } = await supabase.from("profiles").insert({
        user_id: userId,
        first_name: firstName,
        last_name: lastName,
      });

      if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 400 });
      }


      // Note: We NO LONGER create a wallet automatically here.
      // The client must generate the keys and call /api/wallet/link (or equivalent)
      // to associate the public key with this user.

      return NextResponse.json({
        success: true,
        userId,
        // payId and publicKey will be null initially until the user sets up their wallet
        payId: null,
        publicKey: null,
      });
    }

    if (action === "login") {

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }


      const { data: profile } = await supabase
        .from("profiles")
        .select("pay_id")
        .eq("user_id", data.user.id)
        .single();

      const { data: wallet } = await supabase
        .from("wallets")
        .select("public_key")
        .eq("user_id", data.user.id)
        .single();

      return NextResponse.json({
        success: true,
        session: data.session,
        user: {
          id: data.user.id,
          email: data.user.email,
          payId: profile?.pay_id,
          publicKey: wallet?.public_key,
        },
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
