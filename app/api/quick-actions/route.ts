import { NextRequest, NextResponse } from "next/server";
import {
  handleScanQR,
  handlePayId,
  handleBankPayout,
  handleAssetTrade,
} from "@/lib/quickActionsService";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action_type, action } = body;

    if (action_type === "scan_qr") {
      return await handleScanQR(request);
    }

    if (action_type === "pay_id") {
      return await handlePayId(request);
    }

    if (action_type === "bank_payout") {
      return await handleBankPayout(request);
    }

    if (action_type === "trade") {
      return await handleAssetTrade(request);
    }

    return NextResponse.json(
      { error: "Invalid action type" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Quick actions error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action_type = searchParams.get("action_type");
    const action = searchParams.get("action");

    if (action_type === "trade" && action === "fetch_assets") {
      
      const tempRequest = new NextRequest(new URL(""), {
        method: "POST",
        body: JSON.stringify({ action_type, action }),
      });
      tempRequest.headers.set("x-user-id", request.headers.get("x-user-id") || "");
      return await handleAssetTrade(tempRequest);
    }

    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
