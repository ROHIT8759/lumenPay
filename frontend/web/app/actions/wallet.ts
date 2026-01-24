'use server';

import { Keypair } from 'stellar-sdk';
import { supabase } from '@/lib/supabaseClient';
import { encryptKey } from '@/lib/encryption';

export async function createInternalWallet(userId: string) {
    try {
        
        
        const pair = Keypair.random();
        const publicKey = pair.publicKey();
        const secret = pair.secret();

        
        const encryptedSecret = encryptKey(secret);

        
        const { data, error } = await supabase
            .from('wallets')
            .insert({
                user_id: userId,
                public_key: publicKey,
                secret_key_enc: encryptedSecret,
                wallet_type: 'internal'
            })
            .select()
            .single();

        if (error) throw error;

        return { success: true, publicKey };
    } catch (e: any) {
        console.error("Wallet creation failed:", e);
        return { success: false, error: e.message };
    }
}
