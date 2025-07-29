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
exports.UnblockUserDto = exports.BlockUserDto = exports.CancelFollowRequestDto = exports.GetPendingRequestsDto = exports.UnfollowDto = exports.GetFollowersOrFollowingDto = exports.AcceptFollowRequestDto = exports.FollowPersonDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class FollowPersonDto {
    followingId;
}
exports.FollowPersonDto = FollowPersonDto;
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], FollowPersonDto.prototype, "followingId", void 0);
class AcceptFollowRequestDto {
    followerId;
}
exports.AcceptFollowRequestDto = AcceptFollowRequestDto;
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AcceptFollowRequestDto.prototype, "followerId", void 0);
class GetFollowersOrFollowingDto {
    userId;
}
exports.GetFollowersOrFollowingDto = GetFollowersOrFollowingDto;
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GetFollowersOrFollowingDto.prototype, "userId", void 0);
class UnfollowDto {
    followingId;
}
exports.UnfollowDto = UnfollowDto;
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UnfollowDto.prototype, "followingId", void 0);
class GetPendingRequestsDto {
    userId;
}
exports.GetPendingRequestsDto = GetPendingRequestsDto;
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GetPendingRequestsDto.prototype, "userId", void 0);
class CancelFollowRequestDto {
    followingId;
}
exports.CancelFollowRequestDto = CancelFollowRequestDto;
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CancelFollowRequestDto.prototype, "followingId", void 0);
class BlockUserDto {
    blockedId;
}
exports.BlockUserDto = BlockUserDto;
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BlockUserDto.prototype, "blockedId", void 0);
class UnblockUserDto {
    blockedId;
}
exports.UnblockUserDto = UnblockUserDto;
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UnblockUserDto.prototype, "blockedId", void 0);
//# sourceMappingURL=follow.dto.js.map