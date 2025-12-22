import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsEnum, IsUUID } from 'class-validator';

export enum UserSubscriptionStatus {
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
}

export class CreateUserSubscriptionDto {
  @ApiProperty({ description: 'Subscription amount', example: 99.99 })
  @IsNumber()
  subscriptionAmount: number;

  @ApiProperty({
    description: 'Subscription status',
    enum: UserSubscriptionStatus,
    default: UserSubscriptionStatus.ACTIVE,
    required: false
  })
  @IsOptional()
  @IsEnum(UserSubscriptionStatus)
  status?: UserSubscriptionStatus;

  @ApiProperty({ description: 'Comment for the subscription', example: 'Monthly subscription', required: false })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class UpdateUserSubscriptionDto {
  @ApiProperty({ description: 'Subscription amount', example: 149.99, required: false })
  @IsOptional()
  @IsNumber()
  subscriptionAmount?: number;

  @ApiProperty({
    description: 'Subscription status',
    enum: UserSubscriptionStatus,
    required: false
  })
  @IsOptional()
  @IsEnum(UserSubscriptionStatus)
  status?: UserSubscriptionStatus;

  @ApiProperty({ description: 'Comment for the subscription', example: 'Updated monthly subscription', required: false })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiProperty({ description: 'Soft delete flag', example: 0, required: false })
  @IsOptional()
  @IsNumber()
  isDelete?: number;
}

export class UserSubscriptionFilterDto {
  @ApiProperty({ description: 'Filter by status', enum: UserSubscriptionStatus, required: false })
  @IsOptional()
  @IsEnum(UserSubscriptionStatus)
  status?: UserSubscriptionStatus;
}