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
        message: string;
    }>;
}
