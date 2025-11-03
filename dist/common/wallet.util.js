"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateWallet = generateWallet;
const ethers_1 = require("ethers");
function generateWallet() {
    const wallet = ethers_1.ethers.Wallet.createRandom();
    return {
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: wallet.mnemonic?.phrase || '',
    };
}
//# sourceMappingURL=wallet.util.js.map