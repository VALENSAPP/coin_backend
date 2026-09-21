import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum PriceChangeResponseAction {
  ACCEPT = 'ACCEPT',
  CANCEL = 'CANCEL',
}

export class RespondPriceChangeDto {
  @ApiProperty({
    description: 'Action to take on the price change: ACCEPT (accept new price and renew) or CANCEL (cancel autopay)',
    enum: PriceChangeResponseAction,
    example: PriceChangeResponseAction.ACCEPT,
  })
  @IsEnum(PriceChangeResponseAction)
  action: PriceChangeResponseAction;

  @ApiPropertyOptional({
    description: 'Creator user ID whose subscription price changed',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  creatorId?: string;

  @ApiPropertyOptional({
    description: 'Subscription ID (FansSubscriptionBuyData ID)',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsString()
  subscriptionId?: string;

  @ApiPropertyOptional({
    description: 'Notification ID associated with the price change',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @IsOptional()
  @IsString()
  notificationId?: string;
}
