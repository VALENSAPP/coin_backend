export type GeneratedWallet = {
    address: string;
    privateKey: string;
    mnemonic: string;
};
export declare function generateWallet(): GeneratedWallet;
