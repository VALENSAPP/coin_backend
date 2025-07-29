export declare class FollowPersonDto {
    followerId: string;
    followingId: string;
}
export declare class AcceptFollowRequestDto {
    followerId: string;
    followingId: string;
}
export declare class GetFollowersOrFollowingDto {
    userId: string;
}
export declare class UnfollowDto {
    followerId: string;
    followingId: string;
}
export declare class GetPendingRequestsDto {
    userId: string;
}
export declare class CancelFollowRequestDto {
    followerId: string;
    followingId: string;
}
export declare class BlockUserDto {
    blockerId: string;
    blockedId: string;
}
export declare class UnblockUserDto {
    blockerId: string;
    blockedId: string;
}
