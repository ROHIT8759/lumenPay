








export interface NonceData {
    nonce: string;
    expiresAt: number;
}


export const nonceStore = new Map<string, NonceData>();


if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        const now = Date.now();
        for (const [publicKey, data] of nonceStore.entries()) {
            if (data.expiresAt < now) {
                nonceStore.delete(publicKey);
            }
        }
    }, 60000);
}




export function createNonce(publicKey: string): NonceData {
    const crypto = require('crypto');
    const nonce = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 5 * 60 * 1000; 

    const data: NonceData = { nonce, expiresAt };
    nonceStore.set(publicKey, data);

    return data;
}





export function validateAndConsumeNonce(
    publicKey: string,
    nonce: string
): { valid: boolean; error?: string } {
    const storedNonce = nonceStore.get(publicKey);

    if (!storedNonce) {
        return { valid: false, error: 'No nonce found for this address' };
    }

    if (Date.now() > storedNonce.expiresAt) {
        nonceStore.delete(publicKey);
        return { valid: false, error: 'Nonce expired' };
    }

    if (storedNonce.nonce !== nonce) {
        return { valid: false, error: 'Invalid nonce' };
    }

    
    nonceStore.delete(publicKey);

    return { valid: true };
}
