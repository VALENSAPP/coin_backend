import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsArray } from 'class-validator';

export class FollowPersonDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  followingId?: string; // The user to be followed
}

export class AcceptFollowRequestDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  followerId?: string; // The user who sent the follow request
}

export class GetFollowersOrFollowingDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  userId?: string; // The user whose followers/following are being queried
}

export class UnfollowDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  followingId?: string; // The user to be unfollowed
}

export class GetPendingRequestsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  userId?: string; // The user whose pending requests are being queried
}

export class CancelFollowRequestDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  followingId?: string; // The user to whom the request was sent
}

export class BlockUserDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  blockedId?: string; // The user to be blocked
}

export class UnblockUserDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  blockedId?: string; // The user to be unblocked
}