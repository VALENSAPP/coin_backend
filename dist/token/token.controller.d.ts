import { TokenService } from './token.service';
import { CreateTokenDto } from './dto/create-token.dto';
import { Request } from 'express';
export declare class TokenController {
    private readonly tokenService;
    constructor(tokenService: TokenService);
    createToken(dto: CreateTokenDto, req: Request): Promise<{
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
        message: string;
    }>;
    getUserToken(userId: string): Promise<{
        message: string;
        data: {
            userId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            transactionHash: string;
            tokenAddress: string | null;
            tokenName: string;
            tokenSymbol: string;
            initialSupply: string;
            initialPrice: string;
            scalingConstant: string;
            blockNumber: number;
        };
    }>;
    getTokenInfo(tokenAddress: string): Promise<{
        message: string;
        data: {
            coinAddress: any;
            initialPrice: any;
            scalingConstant: any;
            initialSupply: any;
            followers: any;
        };
    }>;
    getUserTokenWithInfo(userId: string): Promise<{
        message: string;
        data: {
            tokenInfo: null;
            userId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
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
            userId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            transactionHash: string;
            tokenAddress: string | null;
            tokenName: string;
            tokenSymbol: string;
            initialSupply: string;
            initialPrice: string;
            scalingConstant: string;
            blockNumber: number;
        };
    }>;
}
