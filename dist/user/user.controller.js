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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = exports.GetProfileDto = exports.CheckDisplayNameDto = exports.ResetPasswordDto = exports.VerifyEmailOtpDto = exports.SendEmailOtpDto = exports.VerifyOtpDto = exports.ForgotPasswordDto = exports.ProfileEditDto = exports.LoginDto = exports.RegisterDto = exports.Gender = exports.RegistrationType = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const user_service_1 = require("./user.service");
const swagger_2 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_3 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const follow_dto_1 = require("./dto/follow.dto");
var RegistrationType;
(function (RegistrationType) {
    RegistrationType["NORMAL"] = "NORMAL";
    RegistrationType["GOOGLE"] = "GOOGLE";
    RegistrationType["TWITTER"] = "TWITTER";
    RegistrationType["WALLET"] = "WALLET";
})(RegistrationType || (exports.RegistrationType = RegistrationType = {}));
var Gender;
(function (Gender) {
    Gender["MALE"] = "MALE";
    Gender["FEMALE"] = "FEMALE";
    Gender["OTHER"] = "OTHER";
})(Gender || (exports.Gender = Gender = {}));
class RegisterDto {
    email;
    password;
    googleId;
    twitterId;
    walletAddress;
    registrationType;
}
exports.RegisterDto = RegisterDto;
__decorate([
    (0, swagger_2.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "email", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "password", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "googleId", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "twitterId", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "walletAddress", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ enum: RegistrationType, required: true }),
    (0, class_validator_1.IsEnum)(RegistrationType),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "registrationType", void 0);
class LoginDto {
    email;
    password;
    googleId;
    twitterId;
    walletAddress;
    registrationType;
}
exports.LoginDto = LoginDto;
__decorate([
    (0, swagger_2.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LoginDto.prototype, "email", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LoginDto.prototype, "password", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LoginDto.prototype, "googleId", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LoginDto.prototype, "twitterId", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LoginDto.prototype, "walletAddress", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ enum: RegistrationType, required: true }),
    (0, class_validator_1.IsEnum)(RegistrationType),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], LoginDto.prototype, "registrationType", void 0);
class ProfileEditDto {
    userName;
    displayName;
    bio;
    walletAddress;
    phoneNumber;
    gender;
    image;
    age;
}
exports.ProfileEditDto = ProfileEditDto;
__decorate([
    (0, swagger_2.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ProfileEditDto.prototype, "userName", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ProfileEditDto.prototype, "displayName", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ProfileEditDto.prototype, "bio", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ProfileEditDto.prototype, "walletAddress", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ProfileEditDto.prototype, "phoneNumber", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({
        enum: Gender,
        required: false,
        description: 'Must be MALE, FEMALE, or OTHER'
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(Gender, { message: 'Gender must be MALE, FEMALE, or OTHER' }),
    __metadata("design:type", String)
], ProfileEditDto.prototype, "gender", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ required: false, type: 'string', format: 'binary' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], ProfileEditDto.prototype, "image", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], ProfileEditDto.prototype, "age", void 0);
class ForgotPasswordDto {
    email;
}
exports.ForgotPasswordDto = ForgotPasswordDto;
__decorate([
    (0, swagger_2.ApiProperty)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], ForgotPasswordDto.prototype, "email", void 0);
class VerifyOtpDto {
    email;
    otp;
}
exports.VerifyOtpDto = VerifyOtpDto;
__decorate([
    (0, swagger_2.ApiProperty)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], VerifyOtpDto.prototype, "email", void 0);
__decorate([
    (0, swagger_2.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], VerifyOtpDto.prototype, "otp", void 0);
class SendEmailOtpDto {
    email;
}
exports.SendEmailOtpDto = SendEmailOtpDto;
__decorate([
    (0, swagger_2.ApiProperty)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], SendEmailOtpDto.prototype, "email", void 0);
class VerifyEmailOtpDto {
    email;
    otp;
}
exports.VerifyEmailOtpDto = VerifyEmailOtpDto;
__decorate([
    (0, swagger_2.ApiProperty)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], VerifyEmailOtpDto.prototype, "email", void 0);
__decorate([
    (0, swagger_2.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], VerifyEmailOtpDto.prototype, "otp", void 0);
class ResetPasswordDto {
    email;
    otp;
    newPassword;
}
exports.ResetPasswordDto = ResetPasswordDto;
__decorate([
    (0, swagger_2.ApiProperty)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], ResetPasswordDto.prototype, "email", void 0);
__decorate([
    (0, swagger_2.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ResetPasswordDto.prototype, "otp", void 0);
__decorate([
    (0, swagger_2.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ResetPasswordDto.prototype, "newPassword", void 0);
class CheckDisplayNameDto {
    displayName;
}
exports.CheckDisplayNameDto = CheckDisplayNameDto;
__decorate([
    (0, swagger_2.ApiProperty)({
        description: 'Display name to check for availability',
        example: 'john_doe'
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CheckDisplayNameDto.prototype, "displayName", void 0);
class GetProfileDto {
    userId;
}
exports.GetProfileDto = GetProfileDto;
__decorate([
    (0, swagger_2.ApiProperty)({
        description: 'User ID to get profile for',
        required: true,
        example: '123e4567-e89b-12d3-a456-426614174000'
    }),
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], GetProfileDto.prototype, "userId", void 0);
let UserController = class UserController {
    userService;
    constructor(userService) {
        this.userService = userService;
    }
    async register(dto) {
        const result = await this.userService.register(dto);
        return {
            message: 'User registered',
            user: {
                access_token: result.access_token,
                ...result.user
            }
        };
    }
    async getProfile(query) {
        const user = await this.userService.getUserById(query.userId);
        return { user };
    }
    async editProfile(req, dto, image) {
        const userId = req.user.userId;
        const user = await this.userService.editProfile(userId, dto, image);
        return { message: 'Profile updated', user };
    }
    async forgotPassword(dto) {
        await this.userService.forgotPassword(dto.email);
        return { message: 'OTP sent to email' };
    }
    async verifyOtp(dto) {
        await this.userService.verifyOtp(dto.email, dto.otp);
        return { message: 'OTP verified' };
    }
    async sendEmailOtp(dto) {
        await this.userService.sendEmailOtp(dto.email);
        return { message: 'OTP sent to email' };
    }
    async verifyEmailOtp(dto) {
        await this.userService.verifyEmailOtp(dto.email, dto.otp);
        return { message: 'Email verified' };
    }
    async resetPassword(dto) {
        await this.userService.resetPassword(dto.email, dto.otp, dto.newPassword);
        return { message: 'Password reset successful' };
    }
    async followPerson(req, dto) {
        const followerId = req.user.userId;
        return this.userService.followPerson(followerId, dto.followingId);
    }
    async unfollow(req, dto) {
        const followerId = req.user.userId;
        return this.userService.unfollow(followerId, dto.followingId);
    }
    async blockUser(req, dto) {
        const blockerId = req.user.userId;
        return this.userService.blockUser(blockerId, dto.blockedId);
    }
    async unblockUser(req, dto) {
        const blockerId = req.user.userId;
        return this.userService.unblockUser(blockerId, dto.blockedId);
    }
    async getPendingFollowRequests(req) {
        const userId = req.user.userId;
        return this.userService.getPendingFollowRequests(userId);
    }
    async getFollowersList(userId) {
        return this.userService.getFollowersList(userId);
    }
    async getFollowingList(userId) {
        return this.userService.getFollowingList(userId);
    }
    async getBlockedUsers(req) {
        const blockerId = req.user.userId;
        return this.userService.getBlockedUsers(blockerId);
    }
    async getAllUsers() {
        const users = await this.userService.getAllUsers();
        return { users };
    }
    async getDisplayNames() {
        const users = await this.userService.getDisplayNames();
        return { users };
    }
    async checkDisplayName(dto) {
        const result = await this.userService.checkDisplayNameAvailability(dto.displayName);
        return result;
    }
    async getUserById(id) {
        const user = await this.userService.getUserById(id);
        return { user };
    }
    async softDeleteUser(id) {
        await this.userService.softDeleteUser(id);
        return { message: 'User soft deleted' };
    }
};
exports.UserController = UserController;
__decorate([
    (0, common_1.Post)('register'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [RegisterDto]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "register", null);
__decorate([
    (0, common_1.Get)('profile'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_3.ApiOperation)({ summary: 'Get user profile by userId' }),
    (0, swagger_3.ApiQuery)({ name: 'userId', type: 'string', description: 'User ID to get profile for' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [GetProfileDto]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Patch)('editProfile'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_3.ApiOperation)({
        summary: 'Edit user profile',
        description: 'Update user profile fields. All fields are optional. If wallet address already exists, it cannot be updated (contact admin).'
    }),
    (0, swagger_3.ApiConsumes)('multipart/form-data'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('image')),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, ProfileEditDto, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "editProfile", null);
__decorate([
    (0, common_1.Post)('forgot-password'),
    (0, swagger_3.ApiOperation)({ summary: 'Send OTP to email for password reset' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ForgotPasswordDto]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "forgotPassword", null);
__decorate([
    (0, common_1.Post)('verify-otp'),
    (0, swagger_3.ApiOperation)({ summary: 'Verify OTP for password reset' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [VerifyOtpDto]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "verifyOtp", null);
__decorate([
    (0, common_1.Post)('send-email-otp'),
    (0, swagger_3.ApiOperation)({ summary: 'Send OTP to email for email verification' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [SendEmailOtpDto]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "sendEmailOtp", null);
__decorate([
    (0, common_1.Post)('verify-email-otp'),
    (0, swagger_3.ApiOperation)({ summary: 'Verify OTP for email verification' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [VerifyEmailOtpDto]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "verifyEmailOtp", null);
__decorate([
    (0, common_1.Post)('reset-password'),
    (0, swagger_3.ApiOperation)({ summary: 'Reset password after OTP verification' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ResetPasswordDto]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "resetPassword", null);
__decorate([
    (0, common_1.Post)('follow'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_3.ApiBody)({ type: follow_dto_1.FollowPersonDto }),
    (0, swagger_3.ApiOperation)({
        summary: 'Follow a user',
        description: 'Follow a user directly (followerId is automatically extracted from JWT token)'
    }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, follow_dto_1.FollowPersonDto]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "followPerson", null);
__decorate([
    (0, common_1.Post)('unfollow'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_3.ApiBody)({ type: follow_dto_1.UnfollowDto }),
    (0, swagger_3.ApiOperation)({
        summary: 'Unfollow a user',
        description: 'Unfollow a user (followerId is automatically extracted from JWT token)'
    }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, follow_dto_1.UnfollowDto]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "unfollow", null);
__decorate([
    (0, common_1.Post)('block-user'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_3.ApiBody)({ type: follow_dto_1.BlockUserDto }),
    (0, swagger_3.ApiOperation)({
        summary: 'Block a user',
        description: 'Block a user (blockerId is automatically extracted from JWT token)'
    }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, follow_dto_1.BlockUserDto]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "blockUser", null);
__decorate([
    (0, common_1.Post)('unblock-user'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_3.ApiBody)({ type: follow_dto_1.UnblockUserDto }),
    (0, swagger_3.ApiOperation)({
        summary: 'Unblock a user',
        description: 'Unblock a user (blockerId is automatically extracted from JWT token)'
    }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, follow_dto_1.UnblockUserDto]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "unblockUser", null);
__decorate([
    (0, common_1.Get)('pending-requests'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_3.ApiOperation)({
        summary: 'Get pending follow requests',
        description: 'Returns empty array since follow requests are now direct (userId is automatically extracted from JWT token)'
    }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getPendingFollowRequests", null);
__decorate([
    (0, common_1.Get)('followers/:userId'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getFollowersList", null);
__decorate([
    (0, common_1.Get)('following/:userId'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getFollowingList", null);
__decorate([
    (0, common_1.Get)('blocked-users'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_3.ApiOperation)({
        summary: 'Get blocked users for the authenticated user',
        description: 'Returns list of users blocked by the authenticated user (blockerId is automatically extracted from JWT token)'
    }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getBlockedUsers", null);
__decorate([
    (0, common_1.Get)('all'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_3.ApiOperation)({ summary: 'Get all users (excluding soft-deleted)' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getAllUsers", null);
__decorate([
    (0, common_1.Get)('display-names'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_3.ApiOperation)({
        summary: 'Get all display names of all users',
        description: 'Retrieves display names, user names, emails, and IDs of all users (excluding soft-deleted users)'
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getDisplayNames", null);
__decorate([
    (0, common_1.Post)('check-display-name'),
    (0, swagger_3.ApiOperation)({
        summary: 'Check display name availability',
        description: 'Check if a display name is available. If taken, returns 4 similar suggestions.'
    }),
    (0, swagger_3.ApiBody)({ type: CheckDisplayNameDto }),
    (0, swagger_3.ApiResponse)({
        status: 200,
        description: 'Display name check result',
        schema: {
            type: 'object',
            properties: {
                status: { type: 'string', enum: ['approved', 'taken'] },
                message: { type: 'string' },
                displayName: { type: 'string' },
                suggestions: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Array of 4 suggested display names (only if status is "taken")'
                }
            }
        }
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CheckDisplayNameDto]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "checkDisplayName", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_3.ApiOperation)({ summary: 'Get user by ID' }),
    (0, swagger_3.ApiParam)({ name: 'id', type: String }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getUserById", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_3.ApiOperation)({ summary: 'Soft delete user by ID' }),
    (0, swagger_3.ApiParam)({ name: 'id', type: String }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "softDeleteUser", null);
exports.UserController = UserController = __decorate([
    (0, swagger_1.ApiTags)('user'),
    (0, common_1.Controller)('user'),
    __metadata("design:paramtypes", [user_service_1.UserService])
], UserController);
//# sourceMappingURL=user.controller.js.map