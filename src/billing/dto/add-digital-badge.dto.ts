import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class AddDigitalBadgeDto {
  @ApiProperty({ description: 'Receiver user ID', example: 'user-uuid-2' })
  @IsString()
  @IsNotEmpty()
  receiverId: string;

  @ApiProperty({ description: 'Amount', example: 10.5 })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ description: 'Transaction ID', example: 'tx-unique-id' })
  @IsString()
  @IsNotEmpty()
  txId: string;
}