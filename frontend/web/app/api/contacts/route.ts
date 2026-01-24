import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);


function validateName(name: string): { valid: boolean; error?: string } {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Name is required' };
  }
  
  const trimmed = name.trim();
  
  if (trimmed.length < 1) {
    return { valid: false, error: 'Name cannot be empty' };
  }
  
  if (trimmed.length > 50) {
    return { valid: false, error: 'Name must be 50 characters or less' };
  }
  
  
  if (/<[^>]*>/.test(trimmed) || /javascript:/i.test(trimmed)) {
    return { valid: false, error: 'Invalid characters in name' };
  }
  
  return { valid: true };
}



export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const address = request.nextUrl.searchParams.get("address");

    if (address) {
      
      const { data: contact, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("user_id", userId)
        .eq("contact_address", address)
        .single();

      if (error && error.code !== 'PGRST116') { 
        throw error;
      }

      return NextResponse.json({ contact: contact || null });
    }

    
    const { data: contacts, error } = await supabase
      .from("contacts")
      .select("*")
      .eq("user_id", userId)
      .order("last_transacted_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ contacts: contacts || [] });
  } catch (error: any) {
    console.error("Error fetching contacts:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { contactAddress, customName } = body;

    if (!contactAddress) {
      return NextResponse.json(
        { error: "Contact address is required" },
        { status: 400 }
      );
    }

    
    const validation = validateName(customName);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const trimmedName = customName.trim();

    
    const { data: existing } = await supabase
      .from("contacts")
      .select("id")
      .eq("user_id", userId)
      .eq("contact_address", contactAddress)
      .single();

    if (existing) {
      
      const { data: updated, error } = await supabase
        .from("contacts")
        .update({
          contact_name: trimmedName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        contact: updated,
        message: "Contact name updated",
      });
    } else {
      
      const { data: created, error } = await supabase
        .from("contacts")
        .insert({
          user_id: userId,
          contact_address: contactAddress,
          contact_name: trimmedName,
          contact_type: "saved",
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        contact: created,
        message: "Contact created",
      });
    }
  } catch (error: any) {
    console.error("Error saving contact:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { contactAddress } = body;

    if (!contactAddress) {
      return NextResponse.json(
        { error: "Contact address is required" },
        { status: 400 }
      );
    }

    
    const { error } = await supabase
      .from("contacts")
      .delete()
      .eq("user_id", userId)
      .eq("contact_address", contactAddress);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: "Contact name removed",
    });
  } catch (error: any) {
    console.error("Error deleting contact:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
