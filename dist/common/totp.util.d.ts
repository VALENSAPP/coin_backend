export declare class TOTPUtil {
    private static base32Chars;
    static generateSecret(length?: number): string;
    private static base32Decode;
    static generateTOTP(secret: string, timeStep?: number, digits?: number): string;
    static verifyTOTP(secret: string, token: string, window?: number): boolean;
    static generateGoogleAuthURL(secret: string, accountName: string, issuer?: string): string;
}
