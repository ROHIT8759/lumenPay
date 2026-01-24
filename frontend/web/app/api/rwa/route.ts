import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);





async function getRwaAssets(request: NextRequest) {
  try {
    const category = request.nextUrl.searchParams.get("category");
    const limit = request.nextUrl.searchParams.get("limit") || "20";
    const offset = request.nextUrl.searchParams.get("offset") || "0";

    let query = supabase
      .from("rwa_assets")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (category) {
      query = query.eq("category", category);
    }

    const { data: assets, error } = await query;

    if (error) throw error;

    const formatted = assets.map((asset: any) => ({
      id: asset.id,
      name: asset.name,
      description: asset.description,
      price: (asset.price_stroops / 10_000_000).toFixed(7),
      priceStroops: asset.price_stroops,
      available: asset.quantity_available,
      image: asset.image_url,
      category: asset.category,
      kycRequired: asset.kyc_required,
    }));

    return NextResponse.json({ assets: formatted });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}





async function createPurchase(request: NextRequest, userId: string) {
  try {
    const { assetId, quantity } = await request.json();

    if (!assetId || quantity <= 0) {
      return NextResponse.json(
        { error: "Invalid parameters" },
        { status: 400 }
      );
    }

    
    const { data: asset } = await supabase
      .from("rwa_assets")
      .select("*")
      .eq("id", assetId)
      .single();

    if (!asset) {
      return NextResponse.json(
        { error: "Asset not found" },
        { status: 404 }
      );
    }

    if (asset.quantity_available < quantity) {
      return NextResponse.json(
        { error: "Insufficient inventory" },
        { status: 400 }
      );
    }

    
    if (asset.kyc_required) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("kyc_status")
        .eq("user_id", userId)
        .single();

      if (!profile || profile.kyc_status < 1) {
        return NextResponse.json(
          { error: "KYC verification required" },
          { status: 403 }
        );
      }
    }

    const totalPrice = asset.price_stroops * quantity;

    
    const { data: purchase, error } = await supabase
      .from("purchases")
      .insert({
        user_id: userId,
        rwa_asset_id: assetId,
        quantity,
        total_price: totalPrice,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    
    await supabase
      .from("rwa_assets")
      .update({
        quantity_available: asset.quantity_available - quantity,
      })
      .eq("id", assetId);

    return NextResponse.json({
      success: true,
      purchaseId: purchase.id,
      totalPrice: (totalPrice / 10_000_000).toFixed(7),
      quantity,
      asset: {
        name: asset.name,
        price: (asset.price_stroops / 10_000_000).toFixed(7),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}





async function getUserPurchases(request: NextRequest, userId: string) {
  try {
    const limit = request.nextUrl.searchParams.get("limit") || "20";
    const offset = request.nextUrl.searchParams.get("offset") || "0";

    const { data: purchases, error } = await supabase
      .from("purchases")
      .select(
        `
        *,
        rwa_assets:rwa_asset_id(name, image_url)
      `
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (error) throw error;

    const formatted = purchases.map((p: any) => ({
      id: p.id,
      asset: p.rwa_assets?.name,
      image: p.rwa_assets?.image_url,
      quantity: p.quantity,
      totalPrice: (p.total_price / 10_000_000).toFixed(7),
      status: p.status,
      createdAt: new Date(p.created_at),
    }));

    return NextResponse.json({ purchases: formatted });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}





async function confirmPurchase(request: NextRequest, userId: string) {
  try {
    const { purchaseId, txHash } = await request.json();

    const { data: purchase } = await supabase
      .from("purchases")
      .select("*")
      .eq("id", purchaseId)
      .eq("user_id", userId)
      .single();

    if (!purchase) {
      return NextResponse.json(
        { error: "Purchase not found" },
        { status: 404 }
      );
    }

    
    const { error } = await supabase
      .from("purchases")
      .update({
        status: "completed",
        stellar_tx_hash: txHash,
        completed_at: new Date(),
      })
      .eq("id", purchaseId);

    if (error) throw error;

    
    await supabase.from("transactions").insert({
      user_id: userId,
      from_address: "purchase",
      to_address: "merchant",
      amount: purchase.total_price,
      asset_code: "XLM",
      type: "purchase",
      status: "confirmed",
      stellar_tx_hash: txHash,
    });

    return NextResponse.json({
      success: true,
      message: "Purchase completed",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}





export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action } = await request.json();

    switch (action) {
      case "create":
        return await createPurchase(request, userId);
      case "confirm":
        return await confirmPurchase(request, userId);
      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const type = request.nextUrl.searchParams.get("type") || "assets";

    if (type === "assets") {
      return await getRwaAssets(request);
    } else if (type === "purchases") {
      return await getUserPurchases(request, userId);
    }

    return NextResponse.json(
      { error: "Invalid type" },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
