import { ethers } from 'ethers';
import { PrismaService } from '../prisma/prisma.service';
export declare class TokenService {
    private readonly prisma;
    private readonly logger;
    private provider;
    private signer;
    private contract;
    private readonly contractABI;
    constructor(prisma: PrismaService);
    private initializeBlockchainConnection;
    createTokenForUser(userId: string): Promise<{
        success: boolean;
        transactionHash: any;
        tokenAddress: any;
        tokenName: string;
        tokenSymbol: string;
        initialSupply: string;
        initialPrice: string;
        scalingConstant: string;
        blockNumber: any;
        userTokenId: string;
    }>;
    getUserToken(userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        transactionHash: string;
        tokenAddress: string | null;
        tokenName: string;
        tokenSymbol: string;
        initialSupply: string;
        initialPrice: string;
        scalingConstant: string;
        blockNumber: number;
    }>;
    getTokenInfo(tokenAddress: string): Promise<{
        coinAddress: any;
        initialPrice: any;
        scalingConstant: any;
        initialSupply: any;
        followers: any;
    }>;
    getUserTokenWithInfo(userId: string): Promise<{
        tokenInfo: null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        transactionHash: string;
        tokenAddress: string | null;
        tokenName: string;
        tokenSymbol: string;
        initialSupply: string;
        initialPrice: string;
        scalingConstant: string;
        blockNumber: number;
    } | {
        tokenInfo: {
            coinAddress: any;
            initialPrice: any;
            scalingConstant: any;
            initialSupply: any;
            followers: any;
        };
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        transactionHash: string;
        tokenAddress: string | null;
        tokenName: string;
        tokenSymbol: string;
        initialSupply: string;
        initialPrice: string;
        scalingConstant: string;
        blockNumber: number;
    }>;
    getContract(): ethers.Contract;
    getPricePerTokenUsd(tokenAddress: string): Promise<{
        tokenAddress: string;
        priceInUsd: number;
        priceInWei: any;
    }>;
}
