/**
 * @deprecated Valens does not sell tokens or use permit/sellWithPermit.
 * This file was used for token sale permit signatures; kept for reference only.
 */
const { ethers } = require("ethers");

// -------- CONFIG --------
const provider = new ethers.providers.JsonRpcProvider("https://data-seed-prebsc-1-s1.binance.org:8545"); // BSC testnet
const privateKey = "privatekey"; // user wallet private key
const tokenAddress = "0xc0502a652b74a6a349a5cbd6f538edf433a152c5";   // deployed UserCoin
const spender = "0xa6A6CeED936C9D19c5e0EcD9F2de8095e0c27a0C";   // ValensAMMController
const value = ethers.utils.parseEther("100"); // approve 100 tokens
const deadline = Math.floor(Date.now() / 1000) + 3600; // 1h from now

// -------- ABI for nonces + permit --------
const tokenAbi = [
  "function name() view returns (string)",
  "function nonces(address) view returns (uint256)",
  "function DOMAIN_SEPARATOR() view returns (bytes32)"
];

async function main() {
  const wallet = new ethers.Wallet(privateKey, provider);
  const token = new ethers.Contract(tokenAddress, tokenAbi, provider);

  const name = await token.name();
  const version = "1";
  const chainId = (await provider.getNetwork()).chainId;
  const nonce = await token.nonces(wallet.address);

  const domain = {
    name,
    version,
    chainId,
    verifyingContract: tokenAddress,
  };

  const types = {
    Permit: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  };

  const message = {
    owner: wallet.address,
    spender,
    value,
    nonce,
    deadline,
  };

  // console.log("Signing with account:", wallet.address);
  // console.log("Message:", message);

  const signature = await wallet._signTypedData(domain, types, message);
  const { v, r, s } = ethers.utils.splitSignature(signature);

  // console.log("\n✅ Permit Signature Generated");
  // console.log("owner:", wallet.address);
  // console.log("spender:", spender);
  // console.log("value:", value.toString());
  // console.log("nonce:", nonce.toString());
  // console.log("deadline:", deadline.toString());
  // console.log("v:", v);
  // console.log("r:", r);
  // console.log("s:", s);
}

main().catch(console.error);