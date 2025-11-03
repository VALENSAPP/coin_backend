import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM recommended 12 bytes

export function encryptSecret(plainText: string, secretKey: string): string {
  if (!secretKey) throw new Error('Encryption key is required');
  const iv = randomBytes(IV_LENGTH);
  const key = scryptSync(secretKey, 'wallet_salt', 32);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

export function decryptSecret(cipherTextB64: string, secretKey: string): string {
  if (!secretKey) throw new Error('Decryption key is required');
  const data = Buffer.from(cipherTextB64, 'base64');
  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + 16);
  const encrypted = data.subarray(IV_LENGTH + 16);
  const key = scryptSync(secretKey, 'wallet_salt', 32);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}


