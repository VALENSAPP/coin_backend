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
    contractABI = [{ "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }], "name": "OwnableInvalidOwner", "type": "error" }, { "inputs": [{ "internalType": "address", "name": "account", "type": "address" }], "name": "OwnableUnauthorizedAccount", "type": "error" }, { "inputs": [], "name": "ReentrancyGuardReentrantCall", "type": "error" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "buyer", "type": "address" }, { "indexed": true, "internalType": "address", "name": "coin", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "tokensOut", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "usdPaid", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "priceUSD", "type": "uint256" }], "name": "Bought", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "previousOwner", "type": "address" }, { "indexed": true, "internalType": "address", "name": "newOwner", "type": "address" }], "name": "OwnershipTransferred", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "coin", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "ReserveMinted", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "coin", "type": "address" }, { "indexed": true, "internalType": "address", "name": "to", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "ReserveWithdrawn", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "user", "type": "address" }, { "indexed": true, "internalType": "address", "name": "coin", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amountTokens", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "priceUSD", "type": "uint256" }], "name": "Sold", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "coin", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "initialSupply", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "initialPriceUSD", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "scalingConstantUSD", "type": "uint256" }], "name": "TokenCreated", "type": "event" }, { "inputs": [{ "internalType": "address", "name": "coin", "type": "address" }, { "internalType": "address", "name": "buyer", "type": "address" }, { "internalType": "uint256", "name": "usdPaid", "type": "uint256" }], "name": "buyFor", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "coin", "type": "address" }], "name": "circulating", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "string", "name": "name", "type": "string" }, { "internalType": "string", "name": "symbol", "type": "string" }, { "internalType": "uint256", "name": "initialSupply", "type": "uint256" }, { "internalType": "uint256", "name": "initialPriceUSD", "type": "uint256" }, { "internalType": "uint256", "name": "scalingConstantUSD", "type": "uint256" }], "name": "createToken", "outputs": [{ "internalType": "address", "name": "coin", "type": "address" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "coin", "type": "address" }], "name": "getPricePerTokenUSD", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }, { "internalType": "address", "name": "", "type": "address" }], "name": "hasFollowed", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "coin", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "mintToReserve", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "owner", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "renounceOwnership", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "coin", "type": "address" }], "name": "reserveBalance", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "coin", "type": "address" }, { "internalType": "address", "name": "user", "type": "address" }, { "internalType": "uint256", "name": "amountTokens", "type": "uint256" }, { "internalType": "uint256", "name": "deadline", "type": "uint256" }, { "internalType": "uint8", "name": "v", "type": "uint8" }, { "internalType": "bytes32", "name": "r", "type": "bytes32" }, { "internalType": "bytes32", "name": "s", "type": "bytes32" }], "name": "sellWithPermit", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "tokens", "outputs": [{ "internalType": "address", "name": "coinAddress", "type": "address" }, { "internalType": "uint256", "name": "initialPriceUSD", "type": "uint256" }, { "internalType": "uint256", "name": "scalingConstantUSD", "type": "uint256" }, { "internalType": "uint256", "name": "initialSupply", "type": "uint256" }, { "internalType": "uint256", "name": "followers", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "newOwner", "type": "address" }], "name": "transferOwnership", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "coin", "type": "address" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "withdrawReserve", "outputs": [], "stateMutability": "nonpayable", "type": "function" }];
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
            console.log("oooooooooo", user);
            if (!user) {
                throw new common_1.BadRequestException('User not found');
            }
            if (!user.userName) {
                throw new common_1.BadRequestException('User must have a username to create a token');
            }
            const existingToken = await this.prisma.userToken.findFirst({
                where: { userId },
            });
            if (existingToken) {
                throw new common_1.BadRequestException('Token already created for this user');
            }
            const tokenName = `${user.userName}Valens`;
            const tokenSymbol = tokenName;
            const initialSupply = ethers_1.ethers.parseEther('0.001');
            const initialPriceUSD = ethers_1.ethers.parseEther('0.001');
            const scalingConstantUSD = ethers_1.ethers.parseEther('0.01');
            this.logger.log(`Creating token for user ${userId}: ${tokenName}`);
            let simulatedTokenAddress = null;
            try {
                simulatedTokenAddress = await this.contract.createToken.staticCall(tokenName, tokenSymbol, initialSupply, initialPriceUSD, scalingConstantUSD);
                this.logger.log(`Simulated token address: ${simulatedTokenAddress}`);
            }
            catch (simError) {
                this.logger.warn('Could not simulate contract call:', simError.message);
            }
            const tx = await this.contract.createToken(tokenName, tokenSymbol, initialSupply, initialPriceUSD, scalingConstantUSD);
            this.logger.log(`Transaction sent: ${tx.hash}`);
            const receipt = await tx.wait();
            this.logger.log(`Transaction confirmed in block: ${receipt.blockNumber}`);
            let tokenAddress = simulatedTokenAddress;
            if (!tokenAddress) {
                this.logger.log(`Receipt logs count: ${receipt.logs.length}`);
                receipt.logs.forEach((log, index) => {
                    try {
                        const parsedLog = this.contract.interface.parseLog(log);
                        if (parsedLog) {
                            this.logger.log(`Log ${index}: ${parsedLog.name}`, parsedLog.args);
                        }
                        else {
                            this.logger.log(`Log ${index}: Parsed as null`);
                        }
                    }
                    catch (parseError) {
                        this.logger.log(`Log ${index}: Unable to parse - ${log.topics?.[0] || 'no topics'}`);
                    }
                });
                if (receipt.returnData) {
                    try {
                        const decodedResult = this.contract.interface.decodeFunctionResult('createToken', receipt.returnData);
                        if (decodedResult && decodedResult[0]) {
                            tokenAddress = decodedResult[0];
                            this.logger.log(`Token address from decoded return data: ${tokenAddress}`);
                        }
                    }
                    catch (decodeError) {
                        this.logger.error('Error decoding return data:', decodeError);
                    }
                }
                if (!tokenAddress) {
                    const tokenCreatedEvent = receipt.logs.find((log) => {
                        try {
                            const parsedLog = this.contract.interface.parseLog(log);
                            return parsedLog?.name === 'TokenCreated';
                        }
                        catch {
                            return false;
                        }
                    });
                    if (tokenCreatedEvent) {
                        try {
                            const parsedLog = this.contract.interface.parseLog(tokenCreatedEvent);
                            if (parsedLog && parsedLog.args) {
                                tokenAddress = parsedLog.args.coin;
                                this.logger.log(`Token created at address: ${tokenAddress}`);
                            }
                        }
                        catch (parseError) {
                            this.logger.error('Error parsing TokenCreated event:', parseError);
                        }
                    }
                    else {
                        this.logger.warn('TokenCreated event not found in transaction logs');
                    }
                }
            }
            const userToken = await this.prisma.userToken.create({
                data: {
                    userId,
                    transactionHash: tx.hash,
                    tokenAddress,
                    tokenName,
                    tokenSymbol,
                    initialSupply: initialSupply.toString(),
                    initialPrice: initialPriceUSD.toString(),
                    scalingConstant: scalingConstantUSD.toString(),
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
                initialPrice: initialPriceUSD.toString(),
                scalingConstant: scalingConstantUSD.toString(),
                blockNumber: receipt.blockNumber,
                userTokenId: userToken.id,
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
    async getUserToken(userId) {
        try {
            const userToken = await this.prisma.userToken.findFirst({
                where: { userId },
                orderBy: { createdAt: 'desc' },
            });
            if (!userToken) {
                throw new common_1.BadRequestException('No token found for this user');
            }
            return userToken;
        }
        catch (error) {
            this.logger.error('Error fetching user token:', error);
            throw error;
        }
    }
    async getTokenInfo(tokenAddress) {
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
        }
        catch (error) {
            this.logger.error('Error fetching token info:', error);
            throw new common_1.BadRequestException(`Failed to fetch token info: ${error.message}`);
        }
    }
    async getUserTokenWithInfo(userId) {
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
        }
        catch (error) {
            this.logger.error('Error fetching user token with info:', error);
            throw error;
        }
    }
    getContract() {
        return this.contract;
    }
    async getPricePerTokenUsd(tokenAddress) {
        try {
            this.logger.log(`Getting price for token: ${tokenAddress}`);
            const priceInWei = await this.contract.getPricePerTokenUSD(tokenAddress);
            const priceInUsd = Number(priceInWei) / 1e18;
            this.logger.log(`Token ${tokenAddress} price: ${priceInUsd} USD`);
            return {
                tokenAddress,
                priceInUsd,
                priceInWei: priceInWei.toString(),
            };
        }
        catch (error) {
            this.logger.error('Error getting token price:', error);
            throw new common_1.BadRequestException(`Failed to get token price: ${error.message}`);
        }
    }
};
exports.TokenService = TokenService;
exports.TokenService = TokenService = TokenService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TokenService);
//# sourceMappingURL=token.service.js.map