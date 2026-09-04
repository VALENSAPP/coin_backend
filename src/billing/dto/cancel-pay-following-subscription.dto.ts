import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CancelPayFollowingSubscriptionDto {
  @ApiPropertyOptional({
    description: 'ID of the FansSubscriptionBuyData record to cancel auto-renew for',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  subscriptionId?: string;

  @ApiPropertyOptional({
    description: 'User ID of the creator/subscribed user whose auto-renew subscription should be cancelled',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  creatorId?: string;
}
