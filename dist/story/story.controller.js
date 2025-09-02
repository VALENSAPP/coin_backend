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
exports.StoryController = void 0;
const common_1 = require("@nestjs/common");
const story_service_1 = require("./story.service");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
let StoryController = class StoryController {
    storyService;
    constructor(storyService) {
        this.storyService = storyService;
    }
    async uploadStory(req, caption, files) {
        const userId = req.user?.userId;
        return this.storyService.uploadStory(userId, files, caption);
    }
    async viewUserStory(userId) {
        return this.storyService.viewUserStory(userId);
    }
    async deleteStory(req, storyId) {
        const userId = req.user?.userId;
        return this.storyService.deleteStory(storyId, userId);
    }
    async followingStory(req) {
        const userId = req.user?.userId;
        return this.storyService.followingStory(userId);
    }
    async commentOnStory(req, comment, storyId) {
        const userId = req.user.userId;
        return this.storyService.commentOnStory(userId, comment, storyId);
    }
    async storyLikeByUser(req, storyId) {
        const userId = req.user.userId;
        return this.storyService.storyLikeByUser(storyId, userId);
    }
};
exports.StoryController = StoryController;
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Post)('upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('media')),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                caption: { type: 'string' },
                media: {
                    type: 'array',
                    items: { type: 'string', format: 'binary' },
                    description: 'Array of image/video files',
                },
            },
        },
    }),
    (0, swagger_1.ApiOperation)({ summary: 'Upload story media (images/videos)' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)('caption')),
    __param(2, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Array]),
    __metadata("design:returntype", Promise)
], StoryController.prototype, "uploadStory", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Get)('by-user'),
    (0, swagger_1.ApiQuery)({ name: 'userId', type: 'string', required: true }),
    (0, swagger_1.ApiOperation)({ summary: 'View stories uploaded by a user' }),
    __param(0, (0, common_1.Query)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], StoryController.prototype, "viewUserStory", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Delete)('delete'),
    (0, swagger_1.ApiQuery)({ name: 'storyId', type: 'string', required: true }),
    (0, swagger_1.ApiOperation)({ summary: 'Delete own story' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('storyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], StoryController.prototype, "deleteStory", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Get)('get'),
    (0, swagger_1.ApiOperation)({ summary: 'Get following story' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], StoryController.prototype, "followingStory", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Post)('commentStory'),
    (0, swagger_1.ApiOperation)({ summary: 'Commented on story' }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                comment: { type: 'string', description: 'Comment text' },
                storyId: { type: 'string', description: 'ID of the story to comment on' },
            },
            required: ['comment', 'storyId'],
        },
    }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)('comment')),
    __param(2, (0, common_1.Body)('storyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], StoryController.prototype, "commentOnStory", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Post)('likeStory'),
    (0, swagger_1.ApiOperation)({ summary: 'Like or unlike a story' }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                storyId: { type: 'string', description: 'ID of the story to like or unlike' },
            },
            required: ['storyId'],
        },
    }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)('storyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], StoryController.prototype, "storyLikeByUser", null);
exports.StoryController = StoryController = __decorate([
    (0, swagger_1.ApiTags)('story'),
    (0, common_1.Controller)('story'),
    __metadata("design:paramtypes", [story_service_1.StoryService])
], StoryController);
//# sourceMappingURL=story.controller.js.map