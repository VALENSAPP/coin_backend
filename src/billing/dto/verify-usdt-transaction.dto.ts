import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString, Matches } from 'class-validator';

export class VerifyUsdtTransactionDto {
  @ApiProperty({ description: 'Sender user ID', example: 'user-uuid-1' })
  @IsString()
  @IsNotEmpty()
  senderId: string;

  @ApiProperty({ description: 'Receiver user ID', example: 'user-uuid-2' })
  @IsString()
  @IsNotEmpty()
  receiverId: string;

  @ApiProperty({
    description: 'Blockchain transaction hash',
    example: '0x5e3b1f4c1b73c8e0b7a7dd1e0b0c0f3d1c9e4f0a8d3e9b2c1a7f4c3d2e1b0a9f',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^0x[a-fA-F0-9]{64}$/, { message: 'txHash must be a 0x-prefixed 32-byte hex string' })
  txHash: string;

  @ApiProperty({
    description: 'Blockchain network',
    example: 'POLYGON',
    enum: ['POLYGON'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['POLYGON'])
  chain: string;
}
