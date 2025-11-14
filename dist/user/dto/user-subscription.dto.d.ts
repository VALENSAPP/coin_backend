export declare enum UserSubscriptionStatus {
    ACTIVE = "ACTIVE",
    CLOSED = "CLOSED"
}
export declare class CreateUserSubscriptionDto {
    subscriptionAmount: number;
    status?: UserSubscriptionStatus;
}
export declare class UpdateUserSubscriptionDto {
    subscriptionAmount?: number;
    status?: UserSubscriptionStatus;
    isDelete?: number;
}
export declare class UserSubscriptionFilterDto {
    status?: UserSubscriptionStatus;
}
