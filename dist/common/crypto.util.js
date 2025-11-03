"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptSecret = encryptSecret;
exports.decryptSecret = decryptSecret;
const crypto_1 = require("crypto");
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
function encryptSecret(plainText, secretKey) {
    if (!secretKey)
        throw new Error('Encryption key is required');
    const iv = (0, crypto_1.randomBytes)(IV_LENGTH);
    const key = (0, crypto_1.scryptSync)(secretKey, 'wallet_salt', 32);
    const cipher = (0, crypto_1.createCipheriv)(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}
function decryptSecret(cipherTextB64, secretKey) {
    if (!secretKey)
        throw new Error('Decryption key is required');
    const data = Buffer.from(cipherTextB64, 'base64');
    const iv = data.subarray(0, IV_LENGTH);
    const authTag = data.subarray(IV_LENGTH, IV_LENGTH + 16);
    const encrypted = data.subarray(IV_LENGTH + 16);
    const key = (0, crypto_1.scryptSync)(secretKey, 'wallet_salt', 32);
    const decipher = (0, crypto_1.createDecipheriv)(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
}
//# sourceMappingURL=crypto.util.js.map