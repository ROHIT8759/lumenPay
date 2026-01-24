import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);





async function getRewards(request: NextRequest, userId: string) {
  try {
    const status = request.nextUrl.searchParams.get("status") || "all";

    let query = supabase
      .from("rewards")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (status !== "all") {
      query = query.eq("status", status);
    }

    const { data: rewards, error } = await query;

    if (error) throw error;

    const formatted = rewards.map((r: any) => ({
      id: r.id,
      type: r.reward_type,
      amount: (r.amount / 10_000_000).toFixed(7),
      amountStroops: r.amount,
      status: r.status,
      description: r.description,
      expiresAt: r.expires_at ? new Date(r.expires_at) : null,
      createdAt: new Date(r.created_at),
    }));

    const summary = {
      pending: rewards.filter((r: any) => r.status === "pending").reduce((sum: number, r: any) => sum + r.amount, 0),
      redeemed: rewards.filter((r: any) => r.status === "redeemed").reduce((sum: number, r: any) => sum + r.amount, 0),
      total: rewards.reduce((sum: number, r: any) => sum + r.amount, 0),
    };

    return NextResponse.json({
      rewards: formatted,
      summary: {
        pendingStroops: summary.pending,
        pending: (summary.pending / 10_000_000).toFixed(7),
        redeemed: (summary.redeemed / 10_000_000).toFixed(7),
        total: (summary.total / 10_000_000).toFixed(7),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}





async function redeemReward(request: NextRequest, userId: string) {
  try {
    const { rewardId } = await request.json();

    const { data: reward } = await supabase
      .from("rewards")
      .select("*")
      .eq("id", rewardId)
      .eq("user_id", userId)
      .single();

    if (!reward) {
      return NextResponse.json(
        { error: "Reward not found" },
        { status: 404 }
      );
    }

    if (reward.status !== "pending") {
      return NextResponse.json(
        { error: "Reward already redeemed or expired" },
        { status: 400 }
      );
    }

    if (reward.expires_at && new Date(reward.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "Reward expired" },
        { status: 400 }
      );
    }

    
    const { error } = await supabase
      .from("rewards")
      .update({
        status: "redeemed",
      })
      .eq("id", rewardId);

    if (error) throw error;

    
    await supabase.from("transactions").insert({
      user_id: userId,
      from_address: "reward_redemption",
      to_address: "wallet",
      amount: reward.amount,
      asset_code: "XLM",
      type: "reward_redemption",
      status: "confirmed",
      memo: `Reward: ${reward.reward_type}`,
    });

    return NextResponse.json({
      success: true,
      amount: (reward.amount / 10_000_000).toFixed(7),
      message: "Reward redeemed successfully",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}





async function grantReward(request: NextRequest) {
  try {
    const { userId, rewardType, amountStroops, description, expiresIn } =
      await request.json();

    if (!userId || !rewardType || !amountStroops) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    let expiresAt = null;
    if (expiresIn) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresIn);
    }

    const { data: reward, error } = await supabase
      .from("rewards")
      .insert({
        user_id: userId,
        reward_type: rewardType,
        amount: amountStroops,
        description,
        expires_at: expiresAt,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      rewardId: reward.id,
      amount: (amountStroops / 10_000_000).toFixed(7),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}





async function getOffers(request: NextRequest) {
  try {
    const { data: offers, error } = await supabase
      .from("offers")
      .select("*")
      .eq("active", true)
      .gte("end_date", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (error) throw error;

    const formatted = offers.map((o: any) => ({
      id: o.id,
      title: o.title,
      description: o.description,
      discount: o.discount_percent,
      minTransaction: o.min_transaction_stroops ? (o.min_transaction_stroops / 10_000_000).toFixed(7) : null,
      usesRemaining: Math.max(0, (o.max_uses || 0) - (o.current_uses || 0)),
      validUntil: new Date(o.end_date),
    }));

    return NextResponse.json({ offers: formatted });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}





export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const { action } = await request.json();

    if (action === "redeem") {
      if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return await redeemReward(request, userId);
    } else if (action === "grant") {
      
      return await grantReward(request);
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const type = request.nextUrl.searchParams.get("type") || "rewards";

    if (type === "rewards") {
      if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return await getRewards(request, userId);
    } else if (type === "offers") {
      return await getOffers(request);
    }

    return NextResponse.json(
      { error: "Invalid type" },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
