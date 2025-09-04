"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var TokenService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenService = void 0;
const common_1 = require("@nestjs/common");
const ethers_1 = require("ethers");
const prisma_service_1 = require("../prisma/prisma.service");
let TokenService = TokenService_1 = class TokenService {
    prisma;
    logger = new common_1.Logger(TokenService_1.name);
    provider;
    signer;
    contract;
    contractABI = [
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
    constructor(prisma) {
        this.prisma = prisma;
        this.initializeBlockchainConnection();
    }
    initializeBlockchainConnection() {
        try {
            const rpcUrl = process.env.BSC_RPC_URL;
            const privateKey = process.env.BSC_PRIVATE_KEY;
            const contractAddress = process.env.BSC_CONTRACT_ADDRESS;
            if (!rpcUrl || !privateKey || !contractAddress) {
                throw new Error('Missing BSC configuration in environment variables');
            }
            this.provider = new ethers_1.ethers.JsonRpcProvider(rpcUrl);
            this.signer = new ethers_1.ethers.Wallet(privateKey, this.provider);
            this.contract = new ethers_1.ethers.Contract(contractAddress, this.contractABI, this.signer);
            this.logger.log('Blockchain connection initialized successfully');
        }
        catch (error) {
            this.logger.error('Failed to initialize blockchain connection:', error);
            throw error;
        }
    }
    async createTokenForUser(userId) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    userName: true,
                    walletAddress: true,
                },
            });
            if (!user) {
                throw new common_1.BadRequestException('User not found');
            }
            if (!user.userName) {
                throw new common_1.BadRequestException('User must have a username to create a token');
            }
            const tokenName = `${user.userName}Valens`;
            const tokenSymbol = tokenName;
            const initialSupply = ethers_1.ethers.parseEther('1000000000000000000000000');
            const initialPrice = ethers_1.ethers.parseEther('100000000000000');
            const scalingConstant = ethers_1.ethers.parseEther('100000000000000');
            this.logger.log(`Creating token for user ${userId}: ${tokenName}`);
            const tx = await this.contract.createToken(tokenName, tokenSymbol, initialSupply, initialPrice, scalingConstant);
            this.logger.log(`Transaction sent: ${tx.hash}`);
            const receipt = await tx.wait();
            this.logger.log(`Transaction confirmed in block: ${receipt.blockNumber}`);
            const tokenCreatedEvent = receipt.logs.find((log) => {
                try {
                    const parsedLog = this.contract.interface.parseLog(log);
                    return parsedLog?.name === 'TokenCreated';
                }
                catch {
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
            };
        }
        catch (error) {
            this.logger.error('Error creating token:', error);
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException(`Failed to create token: ${error.message}`);
        }
    }
};
exports.TokenService = TokenService;
exports.TokenService = TokenService = TokenService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TokenService);
//# sourceMappingURL=token.service.js.map