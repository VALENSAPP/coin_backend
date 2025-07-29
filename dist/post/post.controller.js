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
exports.PostController = void 0;
const common_1 = require("@nestjs/common");
const post_service_1 = require("./post.service");
const create_post_dto_1 = require("./dto/create-post.dto");
const get_post_by_user_dto_1 = require("./dto/get-post-by-user.dto");
const delete_post_dto_1 = require("./dto/delete-post.dto");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
let PostController = class PostController {
    postService;
    constructor(postService) {
        this.postService = postService;
    }
    async createPost(req, body, files) {
        const userId = req.user.userId;
        return this.postService.createPost(userId, body.text, undefined, files, body.caption, body.hashtag, body.location, body.music, body.taggedPeople);
    }
    async getPostByUserId(query) {
        return this.postService.getPostByUserId(query.userId);
    }
    async getAllPost() {
        return this.postService.getAllPost();
    }
    async deletePost(req, query) {
        const userId = req.user.userId;
        return this.postService.deletePost(query.postId, userId);
    }
};
exports.PostController = PostController;
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Post)('create'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('images')),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                text: { type: 'string', description: 'Text content of the post' },
                caption: { type: 'string', description: 'Caption for the post' },
                hashtag: { type: 'array', items: { type: 'string' }, description: 'Hashtags for the post' },
                location: { type: 'string', description: 'Location for the post' },
                music: { type: 'string', description: 'Music for the post' },
                taggedPeople: { type: 'array', items: { type: 'string' }, description: 'Tagged people user IDs' },
                images: {
                    type: 'array',
                    items: { type: 'string', format: 'binary' },
                    description: 'Array of image files',
                },
            },
        },
    }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)(new common_1.ValidationPipe({ whitelist: true }))),
    __param(2, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_post_dto_1.CreatePostDto, Array]),
    __metadata("design:returntype", Promise)
], PostController.prototype, "createPost", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Get)('by-user'),
    __param(0, (0, common_1.Query)(new common_1.ValidationPipe({ whitelist: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [get_post_by_user_dto_1.GetPostByUserDto]),
    __metadata("design:returntype", Promise)
], PostController.prototype, "getPostByUserId", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Get)('all'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PostController.prototype, "getAllPost", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Delete)('delete'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)(new common_1.ValidationPipe({ whitelist: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, delete_post_dto_1.DeletePostDto]),
    __metadata("design:returntype", Promise)
], PostController.prototype, "deletePost", null);
exports.PostController = PostController = __decorate([
    (0, common_1.Controller)('post'),
    __metadata("design:paramtypes", [post_service_1.PostService])
], PostController);
//# sourceMappingURL=post.controller.js.map