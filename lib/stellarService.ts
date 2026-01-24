import { createClient } from "@supabase/supabase-js";
import { TransactionBuilder, Networks, Operation, Asset, Memo, Horizon } from "@stellar/stellar-sdk";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const NETWORK_PASSPHRASE = Networks.TESTNET;.
export async function registerUserWallet(userId: string, publicKey: string) {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("user_id", userId)
      .single();

    let payId = "";
    if (profile?.email) {
      payId = `${profile.email.split("@")[0]}.${userId.slice(0, 8)}@lumenpay`;
    } else {
      payId = `user.${userId.slice(0, 8)}@lumenpay`;
    }

    const { error } = await supabase.from("wallets").insert({
      user_id: userId,
      public_key: publicKey,
      network: "testnet",
    });

    if (error) {
      if (error.code !== '23505') throw error;
    }

    // Update PayID
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ pay_id: payId })
      .eq("user_id", userId);

    if (profileError) throw profileError;

    return {
      success: true,
      payId,
    };
  } catch (error) {
    console.error("Failed to register wallet:", error);
    throw error;
  }
}

export async function getWalletForUser(userId: string) {
  try {
    const { data, error } = await supabase
      .from("wallets")
      .select("public_key")
      .eq("user_id", userId)
      .single();

    if (error) throw error;
    if (!data) return null;

    return {
      publicKey: data.public_key,
    };
  } catch (error) {
    console.error("Failed to get wallet:", error);
    throw error;
  }
}

export async function getBalance(publicKey: string): Promise<string> {
  try {
    const server = new Horizon.Server(
      "https://horizon-testnet.stellar.org"
    );

    const account = await server.loadAccount(publicKey);
    const xlmBalance = account.balances.find((bal) => bal.asset_type === "native");
    return xlmBalance ? xlmBalance.balance : "0";
  } catch (error) {
    console.error("Failed to get balance:", error);
    return "0";
  }
}

export async function getAccountDetails(publicKey: string) {
  try {
    const server = new Horizon.Server(
      "https://horizon-testnet.stellar.org"
    );

    const account = await server.loadAccount(publicKey);
    return {
      sequence: account.sequence,
      balances: account.balances,
    };
  } catch (error) {
    console.error("Failed to get account details:", error);
    throw error;
  }
}

export async function buildPaymentTransaction(params: {
  fromPublicKey: string;
  toPublicKey: string;
  amount: string;
  memo?: string;
  assetCode?: string;
}): Promise<string> {
  try {
    const server = new Horizon.Server(
      "https://horizon-testnet.stellar.org"
    );

    const account = await server.loadAccount(params.fromPublicKey);

    let asset = Asset.native();
    if (params.assetCode && params.assetCode !== "XLM") {
      // TODO: Add support for other assets lookup
      asset = Asset.native();
    }

    const builder = new TransactionBuilder(account, {
      fee: "100",
      networkPassphrase: NETWORK_PASSPHRASE,
    });

    if (params.memo) {
      builder.addMemo(Memo.text(params.memo));
    }

    builder.addOperation(
      Operation.payment({
        destination: params.toPublicKey,
        asset,
        amount: params.amount,
      })
    );

    builder.setTimeout(180);
    const transaction = builder.build();

    return transaction.toEnvelope().toXDR("base64");
  } catch (error) {
    console.error("Failed to build transaction:", error);
    throw error;
  }
}

export async function submitSignedTransaction(
  transactionXdr: string
): Promise<{ hash: string; error?: string }> {
  try {
    const server = new Horizon.Server(
      "https://horizon-testnet.stellar.org"
    );

    const transaction = TransactionBuilder.fromXDR(transactionXdr, NETWORK_PASSPHRASE);
    const result = await server.submitTransaction(transaction);

    return { hash: result.hash };
  } catch (error: unknown) {
    // Better error error handling for Horizon errors
    const horizonError = error as { response?: { data?: { extras?: { result_codes?: { operations?: string[] } } } }; message?: string };
    const errorMessage = horizonError.response?.data?.extras?.result_codes?.operations?.join(', ') || horizonError.message || "Unknown error";
    console.error("Failed to submit transaction:", errorMessage);
    return { hash: "", error: errorMessage };
  }
}






export async function recordTransaction(params: {
  userId: string;
  fromAddress: string;
  toAddress: string;
  toPayId?: string;
  amount: string;
  assetCode: string;
  stellarTxHash: string;
  memo?: string;
  type?: string;
}): Promise<void> {
  try {
    const amountStroops = Math.floor(parseFloat(params.amount) * 10_000_000);

    await supabase.from("transactions").insert({
      user_id: params.userId,
      from_address: params.fromAddress,
      to_address: params.toAddress,
      to_pay_id: params.toPayId,
      amount: amountStroops,
      asset_code: params.assetCode,
      stellar_tx_hash: params.stellarTxHash,
      memo: params.memo,
      type: params.type || "payment",
      status: "confirmed",
      confirmed_at: new Date(),
    });


    const toProfile = await supabase
      .from("profiles")
      .select("id")
      .eq("pay_id", params.toPayId)
      .single();

    if (toProfile.data) {
      const existingPerson = await supabase
        .from("people")
        .select("*")
        .eq("user_id", params.userId)
        .eq("contact_id", toProfile.data.id)
        .single();

      if (existingPerson.data) {

        await supabase
          .from("people")
          .update({
            last_transaction_at: new Date(),
            transaction_count: (existingPerson.data.transaction_count || 0) + 1,
            total_amount_stroops:
              (existingPerson.data.total_amount_stroops || 0) + amountStroops,
            updated_at: new Date(),
          })
          .eq("id", existingPerson.data.id);
      } else {

        const toUser = await supabase
          .from("users")
          .select("id")
          .eq("email", params.toAddress)
          .single();

        if (toUser.data) {
          await supabase.from("people").insert({
            user_id: params.userId,
            contact_id: toProfile.data.id,
            pay_id: params.toPayId,
            public_key: params.toAddress,
            last_transaction_at: new Date(),
            transaction_count: 1,
            total_amount_stroops: amountStroops,
          });
        }
      }
    }
  } catch (error) {
    console.error("Failed to record transaction:", error);
    throw error;
  }
}





export async function resolvePayId(payId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("pay_id", payId)
      .single();

    if (error || !data) return null;

    const wallet = await supabase
      .from("wallets")
      .select("public_key")
      .eq("user_id", data.id)
      .single();

    return wallet.data?.public_key || null;
  } catch (error) {
    console.error("Failed to resolve Pay ID:", error);
    return null;
  }
}





export async function getTransactionHistory(
  userId: string,
  limit: number = 20,
  offset: number = 0
) {
  try {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return data.map((tx: any) => ({
      id: tx.id,
      from: tx.from_address,
      to: tx.to_address,
      toPayId: tx.to_pay_id,
      amount: (tx.amount / 10_000_000).toFixed(7),
      assetCode: tx.asset_code,
      status: tx.status,
      hash: tx.stellar_tx_hash,
      memo: tx.memo,
      type: tx.type,
      createdAt: new Date(tx.created_at),
    }));
  } catch (error) {
    console.error("Failed to get transaction history:", error);
    throw error;
  }
}

export async function getRecentPeople(userId: string, limit: number = 7) {
  try {

    const { data: userWallet, error: walletError } = await supabase
      .from("wallets")
      .select("public_key")
      .eq("user_id", userId)
      .single();

    if (walletError || !userWallet) {
      return [];
    }

    const userAddress = userWallet.public_key;


    const { data: transactions, error: txError } = await supabase
      .from("transactions")
      .select(`
        id,
        tx_type,
        recipient_address,
        recipient_name,
        sender_address,
        sender_display_name,
        amount,
        asset_code,
        created_at,
        status,
        meta_data
      `)
      .eq("user_id", userId)
      .in("tx_type", ["payment_out", "payment_in"])
      .in("status", ["success", "pending", "processing"])
      .order("created_at", { ascending: false });

    if (txError) throw txError;

    if (!transactions || transactions.length === 0) {
      return [];
    }


    const { data: contacts } = await supabase
      .from("contacts")
      .select("contact_address, contact_name")
      .eq("user_id", userId);

    const contactMap = new Map<string, string>();
    (contacts || []).forEach((c: any) => {
      contactMap.set(c.contact_address, c.contact_name);
    });


    const peopleMap = new Map<string, {
      address: string;
      name: string | null;
      senderDisplayName: string | null;
      lastTransactionAt: string;
      direction: 'sent' | 'received';
      lastAmount: number;
      assetCode: string;
    }>();

    for (const tx of transactions) {
      let counterpartAddress: string | null = null;
      let direction: 'sent' | 'received' = 'sent';

      if (tx.tx_type === 'payment_out') {

        counterpartAddress = tx.recipient_address;
        direction = 'sent';
      } else if (tx.tx_type === 'payment_in') {

        counterpartAddress = tx.sender_address || tx.meta_data?.sender_address || tx.recipient_address;
        direction = 'received';
      }


      if (!counterpartAddress || counterpartAddress === userAddress) {
        continue;
      }


      if (!peopleMap.has(counterpartAddress)) {
        peopleMap.set(counterpartAddress, {
          address: counterpartAddress,
          name: tx.recipient_name || null,
          senderDisplayName: tx.sender_display_name || null,
          lastTransactionAt: tx.created_at,
          direction,
          lastAmount: tx.amount,
          assetCode: tx.asset_code || 'USDC',
        });
      }
    }


    const uniquePeople = Array.from(peopleMap.values()).slice(0, limit);


    const enrichedPeople = await Promise.all(
      uniquePeople.map(async (person) => {

        const customName = contactMap.get(person.address);


        const { data: wallet } = await supabase
          .from("wallets")
          .select("user_id")
          .eq("public_key", person.address)
          .single();

        let profileDisplayName: string | null = null;
        let payId: string | null = null;
        let avatarUrl: string | null = null;

        if (wallet?.user_id) {

          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, display_name, avatar_url, pay_id")
            .eq("id", wallet.user_id)
            .single();

          if (profile) {
            profileDisplayName = profile.display_name || profile.full_name || null;
            avatarUrl = profile.avatar_url;
            payId = profile.pay_id;
          }
        }


        const shortAddress = `${person.address.slice(0, 4)}...${person.address.slice(-4)}`;


        const displayName = customName || profileDisplayName || person.senderDisplayName || payId || shortAddress;

        return {
          id: person.address,
          address: person.address,
          shortAddress,
          name: displayName,
          customName: customName || null,
          profileName: profileDisplayName,
          payId,
          avatarUrl,
          lastTransactionAt: person.lastTransactionAt,
          direction: person.direction,
          lastAmount: person.lastAmount,
          assetCode: person.assetCode,
        };
      })
    );

    return enrichedPeople;
  } catch (error) {
    console.error("Failed to get recent people:", error);
    return [];
  }
}
