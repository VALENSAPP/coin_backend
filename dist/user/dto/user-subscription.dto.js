"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserSubscriptionFilterDto = exports.UpdateUserSubscriptionDto = exports.CreateUserSubscriptionDto = exports.UserSubscriptionStatus = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
var UserSubscriptionStatus;
(function (UserSubscriptionStatus) {
    UserSubscriptionStatus["ACTIVE"] = "ACTIVE";
    UserSubscriptionStatus["CLOSED"] = "CLOSED";
})(UserSubscriptionStatus || (exports.UserSubscriptionStatus = UserSubscriptionStatus = {}));
class CreateUserSubscriptionDto {
    subscriptionAmount;
    status;
}
exports.CreateUserSubscriptionDto = CreateUserSubscriptionDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Subscription amount', example: 99.99 }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateUserSubscriptionDto.prototype, "subscriptionAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Subscription status',
        enum: UserSubscriptionStatus,
        default: UserSubscriptionStatus.ACTIVE,
        required: false
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(UserSubscriptionStatus),
    __metadata("design:type", String)
], CreateUserSubscriptionDto.prototype, "status", void 0);
class UpdateUserSubscriptionDto {
    subscriptionAmount;
    status;
    isDelete;
}
exports.UpdateUserSubscriptionDto = UpdateUserSubscriptionDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Subscription amount', example: 149.99, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateUserSubscriptionDto.prototype, "subscriptionAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Subscription status',
        enum: UserSubscriptionStatus,
        required: false
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(UserSubscriptionStatus),
    __metadata("design:type", String)
], UpdateUserSubscriptionDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Soft delete flag', example: 0, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateUserSubscriptionDto.prototype, "isDelete", void 0);
class UserSubscriptionFilterDto {
    status;
    userId;
}
exports.UserSubscriptionFilterDto = UserSubscriptionFilterDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Filter by status', enum: UserSubscriptionStatus, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(UserSubscriptionStatus),
    __metadata("design:type", String)
], UserSubscriptionFilterDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Filter by user ID', example: 'uuid-string', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UserSubscriptionFilterDto.prototype, "userId", void 0);
//# sourceMappingURL=user-subscription.dto.js.map