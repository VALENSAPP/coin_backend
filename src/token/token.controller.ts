import { Controller, Post, Body, UseGuards, Req, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TokenService } from './token.service';
import { CreateTokenDto } from './dto/create-token.dto';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

@ApiTags('token')
@Controller('token')
export class TokenController {
  constructor(private readonly tokenService: TokenService) {}

  @Post('create')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a token for a user',
    description: 'Creates a new token on BSC blockchain using the user\'s name. Only authenticated users can create tokens.'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Token created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        transactionHash: { type: 'string', example: '0x...' },
        tokenAddress: { type: 'string', example: '0x...' },
        tokenName: { type: 'string', example: 'vishalValens' },
        tokenSymbol: { type: 'string', example: 'vishalValens' },
        initialSupply: { type: 'string', example: '1000000000000000000000000' },
        initialPrice: { type: 'string', example: '100000000000000' },
        scalingConstant: { type: 'string', example: '100000000000000' },
        blockNumber: { type: 'number', example: 12345678 }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request - User not found or missing username'
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Invalid or missing JWT token'
  })
  async createToken(@Body() dto: CreateTokenDto, @Req() req: Request) {
    // Get the authenticated user ID from JWT
    const userId = (req.user as any).userId;

    // Optional: Validate that the user can only create tokens for themselves
    // Uncomment the following lines if you want to restrict token creation to self only
    // if (userId !== dto.userId) {
    //   throw new BadRequestException('You can only create tokens for yourself');
    // }

    const result = await this.tokenService.createTokenForUser(dto.userId);

    return {
      message: 'Token created successfully',
      ...result
    };
  }
}