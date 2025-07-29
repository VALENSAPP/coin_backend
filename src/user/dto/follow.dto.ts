import { ApiProperty } from '@nestjs/swagger';

export class FollowPersonDto {
  @ApiProperty()
  followerId: string; // The user who wants to follow
  @ApiProperty()
  followingId: string; // The user to be followed
}

export class AcceptFollowRequestDto {
  @ApiProperty()
  followerId: string; // The user who sent the follow request
  @ApiProperty()
  followingId: string; // The user accepting the request
}

export class GetFollowersOrFollowingDto {
  @ApiProperty()
  userId: string; // The user whose followers/following are being queried
}

export class UnfollowDto {
  @ApiProperty()
  followerId: string; // The user who wants to unfollow
  @ApiProperty()
  followingId: string; // The user to be unfollowed
}

export class GetPendingRequestsDto {
  @ApiProperty()
  userId: string; // The user whose pending requests are being queried
}

export class CancelFollowRequestDto {
  @ApiProperty()
  followerId: string; // The user who sent the follow request
  @ApiProperty()
  followingId: string; // The user to whom the request was sent
}

export class BlockUserDto {
  @ApiProperty()
  blockerId: string; // The user who is blocking
  @ApiProperty()
  blockedId: string; // The user to be blocked
}

export class UnblockUserDto {
  @ApiProperty()
  blockerId: string; // The user who is unblocking
  @ApiProperty()
  blockedId: string; // The user to be unblocked
}