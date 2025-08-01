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
    async createPost(userId, text, images, files, caption, hashtag, location, music, taggedPeople) {
        if (!userId)
            throw new common_1.BadRequestException('User ID required');
        let imageUrls = images || [];
        if (files && files.length > 0) {
            const uploadedUrls = await Promise.all(files.map(f => (0, s3_util_1.uploadImageToS3)(f, 'post-images')));
            imageUrls = imageUrls.concat(uploadedUrls);
        }
        const processedText = text && text.trim() !== '' ? text : null;
        const processedCaption = caption && caption.trim() !== '' ? caption : null;
        const processedLocation = location && location.trim() !== '' ? location : null;
        const processedMusic = music && music.trim() !== '' ? music : null;
        const processedHashtag = hashtag && hashtag.length > 0 ? hashtag : [];
        const processedTaggedPeople = taggedPeople && taggedPeople.length > 0 ? taggedPeople : [];
        return this.prisma.post.create({
            data: {
                userId,
                text: processedText,
                images: imageUrls,
                caption: processedCaption,
                hashtag: processedHashtag,
                location: processedLocation,
                music: processedMusic,
                taggedPeople: processedTaggedPeople,
            },
        });
    }
    async getPostByUserId(userId) {
        console.log('Service received userId:', userId);
        if (!userId)
            throw new common_1.BadRequestException('User ID required');
        return this.prisma.post.findMany({
            where: { userId, deletedAt: null },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getPostById(postId) {
        if (!postId)
            throw new common_1.BadRequestException('Post ID required');
        const post = await this.prisma.post.findUnique({
            where: {
                id: postId,
                deletedAt: null
            },
        });
        if (!post) {
            throw new common_1.BadRequestException('Post not found');
        }
        return post;
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
    async editPost(postId, userId, updateData, files) {
        const post = await this.prisma.post.findUnique({ where: { id: postId } });
        console.log('Service received post:', post?.userId, userId);
        if (!post || post.deletedAt)
            throw new common_1.BadRequestException('Post not found');
        if (post.userId !== userId)
            throw new common_1.BadRequestException('Unauthorized to edit this post');
        let imageUrls = post.images || [];
        if (files && files.length > 0) {
            const uploadedUrls = await Promise.all(files.map(f => (0, s3_util_1.uploadImageToS3)(f, 'post-images')));
            imageUrls = imageUrls.concat(uploadedUrls);
        }
        const updateFields = {};
        if (updateData.text !== undefined && updateData.text !== null && updateData.text.trim() !== '') {
            updateFields.text = updateData.text;
        }
        else if (updateData.text === '') {
            updateFields.text = null;
        }
        if (updateData.caption !== undefined && updateData.caption !== null && updateData.caption.trim() !== '') {
            updateFields.caption = updateData.caption;
        }
        else if (updateData.caption === '') {
            updateFields.caption = null;
        }
        if (updateData.hashtag !== undefined && Array.isArray(updateData.hashtag)) {
            updateFields.hashtag = updateData.hashtag.length > 0 ? updateData.hashtag : [];
        }
        if (updateData.location !== undefined && updateData.location !== null && updateData.location.trim() !== '') {
            updateFields.location = updateData.location;
        }
        else if (updateData.location === '') {
            updateFields.location = null;
        }
        if (updateData.music !== undefined && updateData.music !== null && updateData.music.trim() !== '') {
            updateFields.music = updateData.music;
        }
        else if (updateData.music === '') {
            updateFields.music = null;
        }
        if (updateData.taggedPeople !== undefined && Array.isArray(updateData.taggedPeople)) {
            updateFields.taggedPeople = updateData.taggedPeople.length > 0 ? updateData.taggedPeople : [];
        }
        if (files && files.length > 0) {
            updateFields.images = imageUrls;
        }
        return this.prisma.post.update({
            where: { id: postId },
            data: updateFields,
        });
    }
};
exports.PostService = PostService;
exports.PostService = PostService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PostService);
//# sourceMappingURL=post.service.js.map