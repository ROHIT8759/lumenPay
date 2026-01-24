import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getRecentPeople } from "@/lib/stellarService";

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

    const limit = request.nextUrl.searchParams.get("limit") || "7";
    const people = await getRecentPeople(userId, parseInt(limit));

    return NextResponse.json({ people });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
