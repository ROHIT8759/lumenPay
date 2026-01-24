

import crypto from 'crypto';


const ENCRYPTION_KEY = process.env.WALLET_ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  console.error('⚠️ CRITICAL: WALLET_ENCRYPTION_KEY not set in environment variables');
  console.error('Private keys will NOT be encrypted properly');
}


export function encryptKey(plaintext: string): string {
  if (!ENCRYPTION_KEY) {
    throw new Error('Encryption key not configured. Set WALLET_ENCRYPTION_KEY environment variable.');
  }

  try {
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    
    
    if (key.length !== 32) {
      throw new Error('Encryption key must be 32 bytes (256 bits)');
    }
    
    
    const iv = crypto.randomBytes(16);
    
    
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    
    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    
    
    const authTag = cipher.getAuthTag();
    
    
    const combined = Buffer.concat([iv, authTag, Buffer.from(ciphertext, 'hex')]);
    
    return combined.toString('base64');
  } catch (error: any) {
    console.error('Encryption error:', error.message);
    throw error;
  }
}


export function decryptKey(encrypted: string): string {
  if (!ENCRYPTION_KEY) {
    throw new Error('Encryption key not configured. Set WALLET_ENCRYPTION_KEY environment variable.');
  }

  try {
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    
    
    if (key.length !== 32) {
      throw new Error('Encryption key must be 32 bytes (256 bits)');
    }
    
    
    const combined = Buffer.from(encrypted, 'base64');
    
    
    const iv = combined.slice(0, 16);
    const authTag = combined.slice(16, 32);
    const ciphertext = combined.slice(32);
    
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    
    let plaintext = decipher.update(ciphertext);
    plaintext = Buffer.concat([plaintext, decipher.final()]);
    
    return plaintext.toString('utf8');
  } catch (error: any) {
    console.error('Decryption error:', error.message);
    throw error;
  }
}


export function hashKey(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}


export function generateRandomToken(length: number = 32): string {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}
