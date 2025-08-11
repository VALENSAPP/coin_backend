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
const get_post_by_id_dto_1 = require("./dto/get-post-by-id.dto");
const delete_post_dto_1 = require("./dto/delete-post.dto");
const edit_post_dto_1 = require("./dto/edit-post.dto");
const post_like_dto_1 = require("./dto/post-like.dto");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const post_comment_dto_1 = require("./dto/post-comment.dto");
let PostController = class PostController {
    postService;
    constructor(postService) {
        this.postService = postService;
    }
    async createPost(req, body, files) {
        const userId = req.user.userId;
        return this.postService.createPost(userId, body.text, undefined, files, body.caption, body.hashtag, body.location, body.music, body.taggedPeople);
    }
    async editPost(req, postId, body, files) {
        console.log(">>>>>>>>>>>>>>>>>>>>>", req.user);
        const userId = req.user.userId;
        console.log(">>>>>>>>>>>>>>>>>>>>>", userId);
        return this.postService.editPost(postId, userId, body, files);
    }
    async getPostByUserId(req, query) {
        console.log('Query received:', query);
        console.log('User from JWT:', req.user);
        const targetUserId = query.userId || req.user?.userId;
        console.log('Target user ID:', targetUserId);
        const viewerUserId = req.user?.userId;
        return this.postService.getPostByUserId(targetUserId, viewerUserId);
    }
    async getAllPost(req) {
        const viewerUserId = req.user?.userId;
        return this.postService.getAllPost(viewerUserId);
    }
    async deletePost(req, query) {
        const userId = req.user.userId;
        return this.postService.deletePost(query.postId, userId);
    }
    async postLikeByUser(req, body) {
        const userId = req.user.userId;
        return this.postService.postLikeByUser(body.postId, userId);
    }
    async postLikeList(query) {
        return this.postService.postLikeList(query.postId);
    }
    async commentOnPost(req, dto) {
        const userId = req.user.userId;
        return this.postService.commentOnPost(dto.postId, userId, dto.comment);
    }
    async getCommentListOnPost(dto) {
        return this.postService.getCommentListOnPost(dto.postId);
    }
    async deleteComment(req, dto) {
        const userId = req.user.userId;
        return this.postService.commentDelete(dto.postId, dto.commentId, userId);
    }
    async savePost(req, dto) {
        const userId = req.user.userId;
        return this.postService.savePost(dto.postId, userId);
    }
    async unsavePost(req, dto) {
        const userId = req.user.userId;
        return this.postService.unsavePost(dto.postId, userId);
    }
    async getSavedPosts(req) {
        console.log(">>>>>>>>>>>>>>>>>>>>>", req.user);
        const u = req.user;
        const userId = u?.userId ?? u?.sub;
        return this.postService.getSavedPostsByUser(userId);
    }
    async getPostById(params) {
        return this.postService.getPostById(params.postId);
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
    (0, common_1.Post)('edit/:postId'),
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
    __param(1, (0, common_1.Param)('postId')),
    __param(2, (0, common_1.Body)(new common_1.ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false }))),
    __param(3, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, edit_post_dto_1.EditPostDto, Array]),
    __metadata("design:returntype", Promise)
], PostController.prototype, "editPost", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Get)('by-user'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)(new common_1.ValidationPipe({ whitelist: true, transform: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, get_post_by_user_dto_1.GetPostByUserDto]),
    __metadata("design:returntype", Promise)
], PostController.prototype, "getPostByUserId", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Get)('all'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
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
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Post)('like'),
    (0, swagger_1.ApiOperation)({ summary: 'Like or unlike a post' }),
    (0, swagger_1.ApiBody)({ type: post_like_dto_1.PostLikeByUserDto }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)(new common_1.ValidationPipe({ whitelist: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, post_like_dto_1.PostLikeByUserDto]),
    __metadata("design:returntype", Promise)
], PostController.prototype, "postLikeByUser", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Get)('like/list'),
    (0, swagger_1.ApiOperation)({ summary: 'Get list of users who liked a post' }),
    __param(0, (0, common_1.Query)(new common_1.ValidationPipe({ whitelist: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [post_like_dto_1.PostLikeListDto]),
    __metadata("design:returntype", Promise)
], PostController.prototype, "postLikeList", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Post)('comment'),
    (0, swagger_1.ApiBody)({ type: post_comment_dto_1.CommentOnPostDto }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)(new common_1.ValidationPipe({ whitelist: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, post_comment_dto_1.CommentOnPostDto]),
    __metadata("design:returntype", Promise)
], PostController.prototype, "commentOnPost", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Get)('comment/list'),
    (0, swagger_1.ApiQuery)({ name: 'postId', type: String, required: true }),
    __param(0, (0, common_1.Query)(new common_1.ValidationPipe({ whitelist: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [post_comment_dto_1.GetCommentListOnPostDto]),
    __metadata("design:returntype", Promise)
], PostController.prototype, "getCommentListOnPost", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Delete)('deleteComment'),
    (0, swagger_1.ApiQuery)({ name: 'postId', type: String, required: true }),
    (0, swagger_1.ApiQuery)({ name: 'commentId', type: String, required: true }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)(new common_1.ValidationPipe({ whitelist: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, post_comment_dto_1.CommentDeleteDto]),
    __metadata("design:returntype", Promise)
], PostController.prototype, "deleteComment", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Post)('save'),
    (0, swagger_1.ApiOperation)({ summary: 'Save a post for the authenticated user' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)(new common_1.ValidationPipe({ whitelist: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, post_like_dto_1.SavePostDto]),
    __metadata("design:returntype", Promise)
], PostController.prototype, "savePost", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Post)('unsave'),
    (0, swagger_1.ApiOperation)({ summary: 'Unsave a post for the authenticated user' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)(new common_1.ValidationPipe({ whitelist: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, post_like_dto_1.UnsavePostDto]),
    __metadata("design:returntype", Promise)
], PostController.prototype, "unsavePost", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Get)('getSavedPost'),
    (0, swagger_1.ApiOperation)({ summary: 'Get saved posts for the authenticated user' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PostController.prototype, "getSavedPosts", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Get)('by-id/:postId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a post by ID' }),
    (0, swagger_1.ApiParam)({ name: 'postId', type: 'string', description: 'Post ID' }),
    __param(0, (0, common_1.Param)(new common_1.ValidationPipe({ whitelist: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [get_post_by_id_dto_1.GetPostByIdDto]),
    __metadata("design:returntype", Promise)
], PostController.prototype, "getPostById", null);
exports.PostController = PostController = __decorate([
    (0, common_1.Controller)('post'),
    __metadata("design:paramtypes", [post_service_1.PostService])
], PostController);
//# sourceMappingURL=post.controller.js.map