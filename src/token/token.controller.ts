import { Controller, Post, Body, UseGuards, Req, HttpStatus, Get, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TokenService } from './token.service';
import { CreateTokenDto } from './dto/create-token.dto';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

/** Token endpoints: ERC-20 creation and price are disabled per Valens requirements (software/social platform only, no token issuance). */
@ApiTags('token')
@Controller('token')
export class TokenController {
  constructor(private readonly tokenService: TokenService) {}

  @Post('create')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: '[Disabled] Create a token for a user',
    description: 'Valens does not issue tokens. This endpoint returns 400.'
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

    await this.tokenService.createTokenForUser(dto.userId);
    return { message: 'Token created successfully' };
  }

  @Get('user/:userId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user token from database',
    description: 'Retrieves the token information for a specific user from the database.'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User token retrieved successfully'
  })
  async getUserToken(@Param('userId') userId: string) {
    const result = await this.tokenService.getUserToken(userId);
    return {
      message: 'User token retrieved successfully',
      data: result
    };
  }

  @Get('info/:tokenAddress')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get token info from blockchain',
    description: 'Retrieves token information from the blockchain using the contract\'s tokens function.'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Token info retrieved successfully'
  })
  async getTokenInfo(@Param('tokenAddress') tokenAddress: string) {
    const result = await this.tokenService.getTokenInfo(tokenAddress);
    return {
      message: 'Token info retrieved successfully',
      data: result
    };
  }

  @Get('user/:userId/info')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user token with blockchain info',
    description: 'Retrieves the user\'s token from database along with current blockchain information.'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User token with info retrieved successfully'
  })
  async getUserTokenWithInfo(@Param('userId') userId: string) {
    const result = await this.tokenService.getUserTokenWithInfo(userId);
    return {
      message: 'User token with info retrieved successfully',
      data: result
    };
  }
}