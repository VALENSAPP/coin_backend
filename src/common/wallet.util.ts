import { ethers } from 'ethers';

export type GeneratedWallet = {
  address: string;
  privateKey: string;
  mnemonic: string;
};

export function generateWallet(): GeneratedWallet {
  const wallet = ethers.Wallet.createRandom();
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
    mnemonic: wallet.mnemonic?.phrase || '',
  };
}


