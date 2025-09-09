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
  private readonly contractABI = [
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_protocolWallet",
          "type": "address"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        }
      ],
      "name": "OwnableInvalidOwner",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "OwnableUnauthorizedAccount",
      "type": "error"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "buyer",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "coin",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amountTokens",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "paidWei",
          "type": "uint256"
        }
      ],
      "name": "Bought",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "previousOwner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "OwnershipTransferred",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "seller",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "coin",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amountTokens",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "paidWei",
          "type": "uint256"
        }
      ],
      "name": "Sold",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "coin",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "creator",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "initialSupply",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "initialPrice",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "scalingConstant",
          "type": "uint256"
        }
      ],
      "name": "TokenCreated",
      "type": "event"
    },
    {
      "stateMutability": "payable",
      "type": "fallback"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "coin",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "buyer",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amountTokens",
          "type": "uint256"
        }
      ],
      "name": "buyFor",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "name",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "symbol",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "initialSupply",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "initialPrice_",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "scalingConstant_",
          "type": "uint256"
        }
      ],
      "name": "createToken",
      "outputs": [
        {
          "internalType": "address",
          "name": "coin",
          "type": "address"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "coin",
          "type": "address"
        }
      ],
      "name": "depositToPool",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "coin",
          "type": "address"
        }
      ],
      "name": "getPricePerToken",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "protocolWallet",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "renounceOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "coin",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "seller",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amountTokens",
          "type": "uint256"
        }
      ],
      "name": "sellFrom",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_protocolWallet",
          "type": "address"
        }
      ],
      "name": "setProtocolWallet",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "tokens",
      "outputs": [
        {
          "internalType": "address",
          "name": "coinAddress",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "initialPrice",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "scalingConstant",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "initialSupply",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "totalSold",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "followers",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "poolBalance",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "transferOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "withdrawETH",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "stateMutability": "payable",
      "type": "receive"
    }
  ];

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

  async createTokenForUser(userId: string) {
    try {
      // Get user from database
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          userName: true,
          walletAddress: true,
        },
      });
console.log("oooooooooo",user);

      if (!user) {
        throw new BadRequestException('User not found');
      }

      if (!user.userName) {
        throw new BadRequestException('User must have a username to create a token');
      }

      // Check if token already exists for this user
      const existingToken = await this.prisma.userToken.findFirst({
        where: { userId },
      });
      if (existingToken) {
        throw new BadRequestException('Token already created for this user');
      }

      // Construct token parameters
      const tokenName = `${user.userName}Valens`;
      const tokenSymbol = tokenName;
      const initialSupply = ethers.parseEther('1000000000000000000000000'); // 1e24
      const initialPrice = ethers.parseEther('100000000000000'); // 1e14
      const scalingConstant = ethers.parseEther('100000000000000'); // 1e14

      this.logger.log(`Creating token for user ${userId}: ${tokenName}`);

      // Call the smart contract
      const tx = await this.contract.createToken(
        tokenName,
        tokenSymbol,
        initialSupply,
        initialPrice,
        scalingConstant
      );

      this.logger.log(`Transaction sent: ${tx.hash}`);

      // Wait for transaction confirmation
      const receipt = await tx.wait();

      this.logger.log(`Transaction confirmed in block: ${receipt.blockNumber}`);

      // Extract token address from transaction logs
      const tokenCreatedEvent = receipt.logs.find((log: any) => {
        try {
          const parsedLog = this.contract.interface.parseLog(log);
          return parsedLog?.name === 'TokenCreated';
        } catch {
          return false;
        }
      });

      let tokenAddress = null;
      if (tokenCreatedEvent) {
        const parsedLog = this.contract.interface.parseLog(tokenCreatedEvent);
        if (parsedLog) {
          tokenAddress = parsedLog.args.coin;
        }
      }

      // Save token data to database
      const userToken = await this.prisma.userToken.create({
        data: {
          userId,
          transactionHash: tx.hash,
          tokenAddress,
          tokenName,
          tokenSymbol,
          initialSupply: initialSupply.toString(),
          initialPrice: initialPrice.toString(),
          scalingConstant: scalingConstant.toString(),
          blockNumber: receipt.blockNumber,
        },
      });

      return {
        success: true,
        transactionHash: tx.hash,
        tokenAddress,
        tokenName,
        tokenSymbol,
        initialSupply: initialSupply.toString(),
        initialPrice: initialPrice.toString(),
        scalingConstant: scalingConstant.toString(),
        blockNumber: receipt.blockNumber,
        userTokenId: userToken.id,
      };

    } catch (error) {
      this.logger.error('Error creating token:', error);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(`Failed to create token: ${error.message}`);
    }
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
        initialPrice: tokenInfo.initialPrice.toString(),
        scalingConstant: tokenInfo.scalingConstant.toString(),
        initialSupply: tokenInfo.initialSupply.toString(),
        totalSold: tokenInfo.totalSold.toString(),
        followers: tokenInfo.followers.toString(),
        poolBalance: tokenInfo.poolBalance.toString(),
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
}