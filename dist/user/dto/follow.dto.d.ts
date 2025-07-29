export declare class FollowPersonDto {
    followingId?: string;
}
export declare class AcceptFollowRequestDto {
    followerId?: string;
}
export declare class GetFollowersOrFollowingDto {
    userId?: string;
}
export declare class UnfollowDto {
    followingId?: string;
}
export declare class GetPendingRequestsDto {
    userId?: string;
}
export declare class CancelFollowRequestDto {
    followingId?: string;
}
export declare class BlockUserDto {
    blockedId?: string;
}
export declare class UnblockUserDto {
    blockedId?: string;
}
