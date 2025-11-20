"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOTPUtil = void 0;
const crypto_1 = require("crypto");
class TOTPUtil {
    static base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    static generateSecret(length = 32) {
        let secret = '';
        for (let i = 0; i < length; i++) {
            secret += this.base32Chars[Math.floor(Math.random() * this.base32Chars.length)];
        }
        return secret;
    }
    static base32Decode(encoded) {
        const clean = encoded.replace(/=+$/, '').toUpperCase();
        let bits = '';
        for (const char of clean) {
            const index = this.base32Chars.indexOf(char);
            if (index === -1)
                throw new Error('Invalid base32 character');
            bits += index.toString(2).padStart(5, '0');
        }
        const bytes = [];
        for (let i = 0; i < bits.length; i += 8) {
            bytes.push(parseInt(bits.slice(i, i + 8), 2));
        }
        return Buffer.from(bytes);
    }
    static generateTOTP(secret, timeStep = 30, digits = 6) {
        const key = this.base32Decode(secret);
        const time = Math.floor(Date.now() / 1000 / timeStep);
        const timeBuffer = Buffer.alloc(8);
        timeBuffer.writeBigUInt64BE(BigInt(time), 0);
        const hmac = (0, crypto_1.createHmac)('sha1', key);
        hmac.update(timeBuffer);
        const hash = hmac.digest();
        const offset = hash[hash.length - 1] & 0xf;
        const code = (hash[offset] & 0x7f) << 24 |
            (hash[offset + 1] & 0xff) << 16 |
            (hash[offset + 2] & 0xff) << 8 |
            (hash[offset + 3] & 0xff);
        const otp = (code % Math.pow(10, digits)).toString().padStart(digits, '0');
        return otp;
    }
    static verifyTOTP(secret, token, window = 1) {
        const timeStep = 30;
        const currentTime = Math.floor(Date.now() / 1000 / timeStep);
        for (let i = -window; i <= window; i++) {
            const time = currentTime + i;
            const timeBuffer = Buffer.alloc(8);
            timeBuffer.writeBigUInt64BE(BigInt(time), 0);
            const key = this.base32Decode(secret);
            const hmac = (0, crypto_1.createHmac)('sha1', key);
            hmac.update(timeBuffer);
            const hash = hmac.digest();
            const offset = hash[hash.length - 1] & 0xf;
            const code = (hash[offset] & 0x7f) << 24 |
                (hash[offset + 1] & 0xff) << 16 |
                (hash[offset + 2] & 0xff) << 8 |
                (hash[offset + 3] & 0xff);
            const expectedToken = (code % 1000000).toString().padStart(6, '0');
            if (expectedToken === token) {
                return true;
            }
        }
        return false;
    }
    static generateGoogleAuthURL(secret, accountName, issuer = 'Valens') {
        const params = new URLSearchParams({
            secret: secret,
            issuer: issuer,
            algorithm: 'SHA1',
            digits: '6',
            period: '30'
        });
        return `otpauth://totp/${issuer}:${accountName}?${params.toString()}`;
    }
}
exports.TOTPUtil = TOTPUtil;
//# sourceMappingURL=totp.util.js.map