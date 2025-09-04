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
    }>;
}
