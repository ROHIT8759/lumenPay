import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);





async function createCollateralLoan(request: NextRequest, userId: string) {
  try {
    const { lenderId, principalAmount, interestRate, tenureMonths, collateralAsset, collateralAmount, memo } =
      await request.json();

    
    if (!lenderId || principalAmount <= 0 || interestRate < 0 || tenureMonths <= 0) {
      return NextResponse.json(
        { error: "Invalid loan parameters" },
        { status: 400 }
      );
    }

    
    const { data: loan, error } = await supabase
      .from("loans")
      .insert({
        borrower_id: userId,
        lender_id: lenderId,
        loan_type: "collateral_loan",
        principal_stroops: Math.floor(principalAmount * 10_000_000),
        interest_rate_percent: interestRate,
        tenure_days: tenureMonths * 30,
        collateral_asset: collateralAsset,
        collateral_amount: Math.floor(collateralAmount * 10_000_000),
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    
    const emiAmount = generateEMISchedule(
      Math.floor(principalAmount * 10_000_000),
      interestRate,
      tenureMonths
    );

    
    for (let i = 0; i < tenureMonths; i++) {
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + i + 1);

      await supabase.from("emi_schedules").insert({
        loan_id: loan.id,
        emi_number: i + 1,
        due_date: dueDate.toISOString().split("T")[0],
        principal_due: emiAmount.principal,
        interest_due: emiAmount.interest,
        total_due: emiAmount.total,
        status: "pending",
      });
    }

    return NextResponse.json({
      success: true,
      loanId: loan.id,
      emiAmount: emiAmount.total,
      totalRepayment: emiAmount.total * tenureMonths,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}





async function createFlashLoan(request: NextRequest, userId: string) {
  try {
    const { amount, fee } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount" },
        { status: 400 }
      );
    }

    
    const { data: loan, error } = await supabase
      .from("loans")
      .insert({
        borrower_id: userId,
        lender_id: userId, 
        loan_type: "flash_loan",
        principal_stroops: Math.floor(amount * 10_000_000),
        interest_rate_percent: fee || 0.05, 
        tenure_days: 1, 
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      loanId: loan.id,
      amount,
      fee: (amount * (fee || 0.05)) / 100,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}





async function getLoans(request: NextRequest, userId: string) {
  try {
    const role = request.nextUrl.searchParams.get("role") || "borrower"; 

    let query = supabase.from("loans").select("*");

    if (role === "borrower") {
      query = query.eq("borrower_id", userId);
    } else if (role === "lender") {
      query = query.eq("lender_id", userId);
    }

    const { data: loans, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) throw error;

    return NextResponse.json({ loans });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}





async function payEmi(request: NextRequest, userId: string) {
  try {
    const { loanId, emiNumber } = await request.json();

    
    const { data: loan } = await supabase
      .from("loans")
      .select("*")
      .eq("id", loanId)
      .single();

    const { data: emi } = await supabase
      .from("emi_schedules")
      .select("*")
      .eq("loan_id", loanId)
      .eq("emi_number", emiNumber)
      .single();

    if (!loan || !emi) {
      return NextResponse.json(
        { error: "Loan or EMI not found" },
        { status: 404 }
      );
    }

    if (loan.borrower_id !== userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    
    const { error: updateError } = await supabase
      .from("emi_schedules")
      .update({
        status: "paid",
        paid_at: new Date(),
      })
      .eq("id", emi.id);

    if (updateError) throw updateError;

    
    await supabase.from("transactions").insert({
      user_id: userId,
      from_address: "emi_payment",
      to_address: "emi_received",
      amount: emi.total_due,
      asset_code: "XLM",
      type: "loan_repayment",
      status: "confirmed",
      memo: `EMI Payment - Loan ${loanId}`,
    });

    return NextResponse.json({
      success: true,
      emiId: emi.id,
      amountPaid: (emi.total_due / 10_000_000).toFixed(7),
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
      case "create_collateral":
        return await createCollateralLoan(request, userId);
      case "create_flash":
        return await createFlashLoan(request, userId);
      case "pay_emi":
        return await payEmi(request, userId);
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

    return await getLoans(request, userId);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}





function generateEMISchedule(
  principal: number,
  annualRate: number,
  months: number
) {
  const monthlyRate = annualRate / 12 / 100;
  const numerator = principal * monthlyRate * Math.pow(1 + monthlyRate, months);
  const denominator = Math.pow(1 + monthlyRate, months) - 1;
  const totalEmi = numerator / denominator;

  const totalInterest = totalEmi * months - principal;
  const principalPerMonth = principal / months;
  const interestPerMonth = totalInterest / months;

  return {
    total: Math.floor(totalEmi),
    principal: Math.floor(principalPerMonth),
    interest: Math.floor(interestPerMonth),
  };
}
