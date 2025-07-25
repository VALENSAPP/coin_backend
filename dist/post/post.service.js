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
exports.PostService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const s3_util_1 = require("../common/s3.util");
let PostService = class PostService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createPost(userId, text, images, files) {
        if (!userId)
            throw new common_1.BadRequestException('User ID required');
        let imageUrls = images || [];
        if (files && files.length > 0) {
            const uploadedUrls = await Promise.all(files.map(f => (0, s3_util_1.uploadImageToS3)(f, 'post-images')));
            imageUrls = imageUrls.concat(uploadedUrls);
        }
        return this.prisma.post.create({
            data: {
                userId,
                text,
                images: imageUrls,
            },
        });
    }
    async getPostByUserId(userId) {
        if (!userId)
            throw new common_1.BadRequestException('User ID required');
        return this.prisma.post.findMany({
            where: { userId, deletedAt: null },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getAllPost() {
        return this.prisma.post.findMany({
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
        });
    }
    async deletePost(postId, userId) {
        const post = await this.prisma.post.findUnique({ where: { id: postId } });
        if (!post || post.deletedAt)
            throw new common_1.BadRequestException('Post not found');
        if (post.userId !== userId)
            throw new common_1.BadRequestException('Unauthorized');
        await this.prisma.post.update({
            where: { id: postId },
            data: { deletedAt: new Date() },
        });
        return true;
    }
};
exports.PostService = PostService;
exports.PostService = PostService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PostService);
//# sourceMappingURL=post.service.js.map