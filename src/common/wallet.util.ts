import { ethers } from 'ethers';

/**
 * Valens requirement: Valens will NOT create wallets, control private keys, or sign transactions.
 * Users connect third-party non-custodial wallets (e.g. MetaMask, WalletConnect).
 * This helper is deprecated and should not be used for new user registration.
 */
export type GeneratedWallet = {
  address: string;
  privateKey: string;
  mnemonic: string;
};

/** @deprecated Valens does not create wallets. Use client-side wallet connection and store only public walletAddress. */
export function generateWallet(): GeneratedWallet {
  // const wallet = ethers.Wallet.createRandom();
  // return {
  //   address: wallet.address,
  //   privateKey: wallet.privateKey,
  //   mnemonic: wallet.mnemonic?.phrase || '',
  // };
  throw new Error('Valens does not create wallets. Users must connect their own non-custodial wallet.');
}


