import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TRULIOO_API_KEY = process.env.TRULIOO_API_KEY;
const TRULIOO_API_URL = "https://api.trulioo.com/trial/v1";





async function initiateKyc(request: NextRequest, userId: string) {
  try {
    const { firstName, lastName, email, dateOfBirth, country } =
      await request.json();

    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    
    const response = await fetch(
      `${TRULIOO_API_URL}/Verification/Verify`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Trulioo-API-Key": TRULIOO_API_KEY || "demo-key",
        },
        body: JSON.stringify({
          AcceptTruliooTermsAndConditions: true,
          Email: email,
          FirstName: firstName,
          LastName: lastName,
          MiddleName: "",
          DOB: dateOfBirth || "",
          CountryCode: country || "US",
          Verbose: true,
        }),
      }
    );

    const result = await response.json();

    
    const kycHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(result))
      .digest("hex");

    const { data: kycRecord, error } = await supabase
      .from("kyc_records")
      .upsert(
        {
          user_id: userId,
          verification_level: 1, 
          status: result.Record?.RecordStatus || "pending",
          kyc_hash: kycHash,
          submitted_at: new Date(),
        },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      kycId: kycRecord.id,
      status: result.Record?.RecordStatus || "pending",
      message: "KYC verification initiated",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}





async function checkKycStatus(request: NextRequest, userId: string) {
  try {
    const { data: kycRecord, error } = await supabase
      .from("kyc_records")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      return NextResponse.json(
        { status: "not_started", level: 0 },
        { status: 200 }
      );
    }

    return NextResponse.json({
      status: kycRecord.status,
      level: kycRecord.verification_level,
      verifiedAt: kycRecord.verified_at,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}





async function approveKyc(request: NextRequest, userId: string) {
  try {
    const { verificationLevel } = await request.json();

    
    const { error: kycError } = await supabase
      .from("kyc_records")
      .update({
        status: "approved",
        verification_level: verificationLevel || 2,
        verified_at: new Date(),
      })
      .eq("user_id", userId);

    if (kycError) throw kycError;

    
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        kyc_status: verificationLevel || 2,
        kyc_verified_at: new Date(),
      })
      .eq("user_id", userId);

    if (profileError) throw profileError;

    return NextResponse.json({
      success: true,
      message: "KYC approved",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}





async function getKycLimits(request: NextRequest, userId: string) {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("kyc_status, daily_limit_stroops, total_spent_today")
      .eq("user_id", userId)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    const limits = {
      0: 10_000_000, 
      1: 100_000_000, 
      2: 1_000_000_000, 
    };

    const dailyLimit = limits[profile.kyc_status as 0 | 1 | 2] || limits[0];
    const remainingToday = dailyLimit - (profile.total_spent_today || 0);

    return NextResponse.json({
      kycLevel: profile.kyc_status,
      dailyLimit: (dailyLimit / 10_000_000).toFixed(7),
      spentToday: ((profile.total_spent_today || 0) / 10_000_000).toFixed(7),
      remainingToday: Math.max(0, remainingToday / 10_000_000),
      canTransact: remainingToday > 0,
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
      case "initiate":
        return await initiateKyc(request, userId);
      case "approve":
        return await approveKyc(request, userId);
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

    const action = request.nextUrl.searchParams.get("action") || "status";

    if (action === "status") {
      return await checkKycStatus(request, userId);
    } else if (action === "limits") {
      return await getKycLimits(request, userId);
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
