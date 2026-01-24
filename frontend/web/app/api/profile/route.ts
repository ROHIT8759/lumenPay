import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);


function validateDisplayName(name: string): { valid: boolean; error?: string } {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Display name is required' };
  }
  
  const trimmed = name.trim();
  
  if (trimmed.length < 1) {
    return { valid: false, error: 'Display name cannot be empty' };
  }
  
  if (trimmed.length > 50) {
    return { valid: false, error: 'Display name must be 50 characters or less' };
  }
  
  
  if (/<[^>]*>/.test(trimmed) || /javascript:/i.test(trimmed)) {
    return { valid: false, error: 'Invalid characters in display name' };
  }
  
  return { valid: true };
}


export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, full_name, display_name, avatar_url, pay_id, kyc_status, created_at")
      .eq("id", userId)
      .single();

    if (profileError) throw profileError;

    
    const { data: wallet, error: walletError } = await supabase
      .from("wallets")
      .select("public_key")
      .eq("user_id", userId)
      .single();

    if (walletError && walletError.code !== 'PGRST116') {
      throw walletError;
    }

    return NextResponse.json({
      profile: {
        ...profile,
        walletAddress: wallet?.public_key || null,
        
        displayName: profile.display_name || profile.full_name,
      }
    });
  } catch (error: any) {
    console.error("Error fetching profile:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { displayName } = body;

    
    const validation = validateDisplayName(displayName);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const trimmedName = displayName.trim();

    
    const { data: updated, error } = await supabase
      .from("profiles")
      .update({
        display_name: trimmedName,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select("id, email, full_name, display_name, avatar_url, pay_id")
      .single();

    if (error) throw error;

    
    const { data: wallet } = await supabase
      .from("wallets")
      .select("public_key")
      .eq("user_id", userId)
      .single();

    return NextResponse.json({
      success: true,
      profile: {
        ...updated,
        walletAddress: wallet?.public_key || null,
        displayName: updated.display_name || updated.full_name,
      },
      message: "Display name updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating profile:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 200 });
}
