import { Keypair } from '@stellar/stellar-sdk';
import {
    WalletBackup,
    encryptBackupForTransfer,
    decryptBackupFromTransfer,
    createWalletBackup
} from './mnemonicSupport';


const QR_VERSION = 1;


const TRANSFER_EXPIRY_MS = 5 * 60 * 1000;

export interface QRSyncPayload {
    version: number;
    type: 'wallet_transfer';
    data: string;
    expires: number;
    checksum: string;
}

export interface SyncResult {
    success: boolean;
    publicKey?: string;
    error?: string;
}




export async function generateSyncQRPayload(
    secretKey: string,
    pin: string,
    network: 'testnet' | 'public' = 'testnet'
): Promise<{ payload: string; publicKey: string }> {

    const keypair = Keypair.fromSecret(secretKey);


    const backup = createWalletBackup(keypair, network);


    const encryptedData = await encryptBackupForTransfer(backup, pin);


    const qrPayload: QRSyncPayload = {
        version: QR_VERSION,
        type: 'wallet_transfer',
        data: encryptedData,
        expires: Date.now() + TRANSFER_EXPIRY_MS,
        checksum: keypair.publicKey().substring(0, 8),
    };


    return {
        payload: JSON.stringify(qrPayload),
        publicKey: keypair.publicKey(),
    };
}




export async function parseSyncQRPayload(
    qrData: string,
    pin: string
): Promise<SyncResult> {
    try {

        const payload: QRSyncPayload = JSON.parse(qrData);


        if (payload.version !== QR_VERSION) {
            return {
                success: false,
                error: `Unsupported QR version: ${payload.version}`
            };
        }


        if (payload.type !== 'wallet_transfer') {
            return {
                success: false,
                error: 'Invalid QR code type'
            };
        }


        if (Date.now() > payload.expires) {
            return {
                success: false,
                error: 'Transfer expired. Generate a new QR code.'
            };
        }


        const backup = await decryptBackupFromTransfer(payload.data, pin);


        if (!backup.publicKey.startsWith(payload.checksum)) {
            return {
                success: false,
                error: 'Invalid PIN or corrupted data'
            };
        }


        try {
            const keypair = Keypair.fromSecret(backup.secretKey);
            if (keypair.publicKey() !== backup.publicKey) {
                throw new Error('Key mismatch');
            }
        } catch {
            return {
                success: false,
                error: 'Invalid wallet data'
            };
        }

        return {
            success: true,
            publicKey: backup.publicKey,
        };
    } catch (error: any) {
        return {
            success: false,
            error: error.message || 'Failed to parse QR code',
        };
    }
}




export async function getWalletFromSyncQR(
    qrData: string,
    pin: string
): Promise<WalletBackup | null> {
    try {
        const payload: QRSyncPayload = JSON.parse(qrData);

        if (Date.now() > payload.expires) {
            return null;
        }

        const backup = await decryptBackupFromTransfer(payload.data, pin);


        const keypair = Keypair.fromSecret(backup.secretKey);
        if (keypair.publicKey() !== backup.publicKey) {
            return null;
        }

        return backup;
    } catch {
        return null;
    }
}




export function generateTransferPin(): string {
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    return pin;
}




export function validatePin(pin: string): boolean {
    return /^\d{6}$/.test(pin);
}
