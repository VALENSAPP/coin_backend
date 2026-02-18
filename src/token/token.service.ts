import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet;
  private contract: ethers.Contract;

  // Contract ABI
  private readonly contractABI = [{"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"OwnableInvalidOwner","type":"error"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"OwnableUnauthorizedAccount","type":"error"},{"inputs":[],"name":"ReentrancyGuardReentrantCall","type":"error"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"buyer","type":"address"},{"indexed":true,"internalType":"address","name":"coin","type":"address"},{"indexed":false,"internalType":"uint256","name":"tokensOut","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"usdPaid","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"priceUSD","type":"uint256"}],"name":"Bought","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"coin","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"ReserveMinted","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"coin","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"ReserveWithdrawn","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":true,"internalType":"address","name":"coin","type":"address"},{"indexed":false,"internalType":"uint256","name":"amountTokens","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"priceUSD","type":"uint256"}],"name":"Sold","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"coin","type":"address"},{"indexed":false,"internalType":"uint256","name":"initialSupply","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"initialPriceUSD","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"scalingConstantUSD","type":"uint256"}],"name":"TokenCreated","type":"event"},{"inputs":[{"internalType":"address","name":"coin","type":"address"},{"internalType":"address","name":"buyer","type":"address"},{"internalType":"uint256","name":"usdPaid","type":"uint256"}],"name":"buyFor","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"coin","type":"address"}],"name":"circulating","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"name","type":"string"},{"internalType":"string","name":"symbol","type":"string"},{"internalType":"uint256","name":"initialSupply","type":"uint256"},{"internalType":"uint256","name":"initialPriceUSD","type":"uint256"},{"internalType":"uint256","name":"scalingConstantUSD","type":"uint256"}],"name":"createToken","outputs":[{"internalType":"address","name":"coin","type":"address"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"coin","type":"address"}],"name":"getPricePerTokenUSD","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"}],"name":"hasFollowed","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"coin","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"mintToReserve","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"coin","type":"address"}],"name":"reserveBalance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"coin","type":"address"},{"internalType":"address","name":"user","type":"address"},{"internalType":"uint256","name":"amountTokens","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"sellWithPermit","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"tokens","outputs":[{"internalType":"address","name":"coinAddress","type":"address"},{"internalType":"uint256","name":"initialPriceUSD","type":"uint256"},{"internalType":"uint256","name":"scalingConstantUSD","type":"uint256"},{"internalType":"uint256","name":"initialSupply","type":"uint256"},{"internalType":"uint256","name":"followers","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"coin","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"withdrawReserve","outputs":[],"stateMutability":"nonpayable","type":"function"}]
  
  constructor(private readonly prisma: PrismaService) {
    this.initializeBlockchainConnection();
  }

  private initializeBlockchainConnection() {
    try {
      const rpcUrl = process.env.BSC_RPC_URL;
      const privateKey = process.env.BSC_PRIVATE_KEY;
      const contractAddress = process.env.BSC_CONTRACT_ADDRESS;

      if (!rpcUrl || !privateKey || !contractAddress) {
        throw new Error('Missing BSC configuration in environment variables');
      }

      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      this.signer = new ethers.Wallet(privateKey, this.provider);
      this.contract = new ethers.Contract(contractAddress, this.contractABI, this.signer);

      this.logger.log('Blockchain connection initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize blockchain connection:', error);
      throw error;
    }
  }

  /** @deprecated Valens does not issue ERC-20 tokens. Excluded per requirements. */
  async createTokenForUser(userId: string) {
    throw new BadRequestException(
      'Token creation is not available. Valens operates as a software/social platform only and does not issue or sell tokens.'
    );
    // Original implementation commented per Valens requirements (no ERC-20 issuance):
    // try {
    //   const user = await this.prisma.user.findUnique({ ... });
    //   ...
    //   const tx = await this.contract.createToken(...);
    //   ...
    // } catch (error) { ... }
  }

  async getUserToken(userId: string) {
    try {
      const userToken = await this.prisma.userToken.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' }, // Get the latest token
      });

      if (!userToken) {
        throw new BadRequestException('No token found for this user');
      }

      return userToken;
    } catch (error) {
      this.logger.error('Error fetching user token:', error);
      throw error;
    }
  }

  async getTokenInfo(tokenAddress: string) {
    try {
      const tokenInfo = await this.contract.tokens(tokenAddress);

      return {
        coinAddress: tokenInfo.coinAddress,
        initialPrice: tokenInfo.initialPriceUSD.toString(),
        scalingConstant: tokenInfo.scalingConstantUSD.toString(),
        initialSupply: tokenInfo.initialSupply.toString(),
        followers: tokenInfo.followers.toString(),
      };
    } catch (error) {
      this.logger.error('Error fetching token info:', error);
      throw new BadRequestException(`Failed to fetch token info: ${error.message}`);
    }
  }

  async getUserTokenWithInfo(userId: string) {
    try {
      const userToken = await this.getUserToken(userId);

      if (!userToken.tokenAddress) {
        return {
          ...userToken,
          tokenInfo: null,
        };
      }

      const tokenInfo = await this.getTokenInfo(userToken.tokenAddress);

      return {
        ...userToken,
        tokenInfo,
      };
    } catch (error) {
      this.logger.error('Error fetching user token with info:', error);
      throw error;
    }
  }

  /**
   * Get the smart contract instance
   */
  getContract() {
    return this.contract;
  }

  /**
   * @deprecated Valens does not calculate or display token prices. Excluded per requirements.
   */
  async getPricePerTokenUsd(tokenAddress: string) {
    throw new BadRequestException(
      'Token price is not available. Valens does not display token prices, ROI, or gains.'
    );
    // Original implementation commented: no token pricing per Valens requirements.
  }
}