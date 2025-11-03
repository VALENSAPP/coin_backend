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
    async createPost(userId, text, images, files, caption, hashtag, location, music, link, taggedPeople, type, raiseAmount, start_time, end_time) {
        if (!userId)
            throw new common_1.BadRequestException('User ID required');
        if (type === 'crowdfunding') {
            if (raiseAmount === null || raiseAmount === undefined || start_time === null || start_time === undefined || end_time === null || end_time === undefined) {
                throw new common_1.BadRequestException('raiseAmount, start_time, and end_time are required for crowdfunding posts');
            }
            const postHit = await this.prisma.postHit.findFirst({
                where: { userId },
            });
            if (!postHit || postHit.hitLeft <= 0) {
                throw new common_1.BadRequestException('No hits left to create a crowdfunding post');
            }
        }
        let imageUrls = images || [];
        if (files && files.length > 0) {
            const uploadedUrls = await Promise.all(files.map(f => (0, s3_util_1.uploadImageToS3)(f, 'post-images')));
            imageUrls = imageUrls.concat(uploadedUrls);
        }
        const processedText = text && text.trim() !== '' ? text : null;
        const processedCaption = caption && caption.trim() !== '' ? caption : null;
        const processedLocation = location && location.trim() !== '' ? location : null;
        const processedMusic = music && music.trim() !== '' ? music : null;
        const processedLink = link && link.trim() !== '' ? link : null;
        const processedHashtag = hashtag && hashtag.length > 0 ? hashtag : [];
        const processedTaggedPeople = taggedPeople && taggedPeople.length > 0 ? taggedPeople : [];
        const processedRaiseAmount = raiseAmount ? parseFloat(raiseAmount.toString()) : null;
        const processedStartTime = start_time ? new Date(start_time) : null;
        const processedEndTime = end_time ? new Date(end_time) : null;
        return this.prisma.$transaction(async (tx) => {
            if (type === 'crowdfunding') {
                const postHit = await tx.postHit.findFirst({ where: { userId } });
                if (!postHit)
                    throw new common_1.BadRequestException('PostHit record not found');
                await tx.postHit.update({
                    where: { id: postHit.id },
                    data: { hitLeft: { decrement: 1 } },
                });
            }
            return tx.post.create({
                data: {
                    userId,
                    text: processedText,
                    images: imageUrls,
                    caption: processedCaption,
                    hashtag: processedHashtag,
                    location: processedLocation,
                    music: processedMusic,
                    link: processedLink,
                    taggedPeople: processedTaggedPeople,
                    type,
                    raiseAmount: processedRaiseAmount,
                    start_time: processedStartTime,
                    end_time: processedEndTime,
                },
            });
        }, {
            timeout: 10000
        });
    }
    async savePost(postId, userId) {
        if (!postId)
            throw new common_1.BadRequestException('Post ID required');
        if (!userId)
            throw new common_1.BadRequestException('User ID required');
        const post = await this.prisma.post.findUnique({ where: { id: postId, deletedAt: null } });
        if (!post)
            throw new common_1.BadRequestException('Post not found');
        try {
            await this.prisma.savePost.create({ data: { postId, userId } });
        }
        catch (error) {
            const isUniqueViolation = error?.code === 'P2002';
            if (!isUniqueViolation)
                throw error;
        }
        return { message: 'Post saved successfully' };
    }
    async unsavePost(postId, userId) {
        if (!postId)
            throw new common_1.BadRequestException('Post ID required');
        if (!userId)
            throw new common_1.BadRequestException('User ID required');
        await this.prisma.savePost.delete({
            where: { postId_userId: { postId, userId } },
        }).catch(() => undefined);
        return { message: 'Post unsaved successfully' };
    }
    async getPostByUserId(userId, viewerUserId) {
        console.log('Service received userId:', userId);
        if (!userId)
            throw new common_1.BadRequestException('User ID required');
        const posts = await this.prisma.post.findMany({
            where: { userId, deletedAt: null },
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        displayName: true,
                        image: true,
                    },
                },
                _count: {
                    select: {
                        likes: true,
                        comments: true,
                        shares: true,
                    },
                },
            }
        });
        let savedSet = new Set();
        let likedSet = new Set();
        if (viewerUserId) {
            const saved = await this.prisma.savePost.findMany({
                where: { userId: viewerUserId, postId: { in: posts.map(p => p.id) } },
                select: { postId: true },
            });
            savedSet = new Set(saved.map(s => s.postId));
        }
        if (viewerUserId) {
            const saved = await this.prisma.savePost.findMany({
                where: { userId: viewerUserId, postId: { in: posts.map(p => p.id) } },
                select: { postId: true },
            });
            savedSet = new Set(saved.map(s => s.postId));
            const liked = await this.prisma.postLike.findMany({
                where: { userId: viewerUserId, postId: { in: posts.map(p => p.id) } },
                select: { postId: true },
            });
            likedSet = new Set(liked.map(l => l.postId));
        }
        let followMap = {};
        if (viewerUserId) {
            const authorIds = Array.from(new Set(posts.map(p => p.userId)));
            if (authorIds.length > 0) {
                const follows = await this.prisma.followerAndFollowing.findMany({
                    where: { followerId: viewerUserId, followingId: { in: authorIds }, status: 'ACCEPTED' },
                    select: { followingId: true },
                });
                followMap = follows.reduce((acc, f) => { acc[f.followingId] = true; return acc; }, {});
            }
        }
        return posts.map(post => ({
            id: post.id,
            text: post.text,
            images: post.images,
            caption: post.caption,
            hashtag: post.hashtag,
            location: post.location,
            music: post.music,
            taggedPeople: post.taggedPeople,
            createdAt: post.createdAt,
            updatedAt: post.updatedAt,
            deletedAt: post.deletedAt,
            userId: post.userId,
            userName: post.user?.displayName || null,
            userImage: post.user?.image || null,
            likeCount: post._count.likes,
            commentCount: post._count.comments,
            isSaved: savedSet.has(post.id),
            isLike: likedSet.has(post.id),
            shareCount: post._count.shares,
            isFollow: !!followMap[post.userId],
        }));
    }
    async getPostById(postId, viewerId) {
        if (!postId)
            throw new common_1.BadRequestException('Post ID required');
        const post = await this.prisma.post.findUnique({
            where: {
                id: postId,
                deletedAt: null,
            },
            include: {
                user: {
                    select: {
                        displayName: true,
                        image: true,
                        profile: true,
                    },
                },
                _count: {
                    select: {
                        likes: true,
                        comments: true,
                        shares: true,
                    },
                },
            },
        });
        if (!post) {
            throw new common_1.BadRequestException('Post not found');
        }
        const saved = await this.prisma.savePost.findFirst({
            where: { userId: viewerId, postId },
        });
        const liked = await this.prisma.postLike.findFirst({
            where: { userId: viewerId, postId },
        });
        const hidden = viewerId
            ? await this.prisma.hidePost.findFirst({ where: { userId: viewerId, postId } })
            : null;
        let isFollow = false;
        if (viewerId) {
            const follow = await this.prisma.followerAndFollowing.findFirst({
                where: { followerId: viewerId, followingId: post.userId, status: 'ACCEPTED' },
                select: { id: true },
            });
            isFollow = !!follow;
        }
        return {
            id: post.id,
            text: post.text,
            images: post.images,
            caption: post.caption,
            hashtag: post.hashtag,
            location: post.location,
            music: post.music,
            taggedPeople: post.taggedPeople,
            createdAt: post.createdAt,
            updatedAt: post.updatedAt,
            deletedAt: post.deletedAt,
            userId: post.userId,
            userName: post.user?.displayName || null,
            userImage: post.user?.image || null,
            profile: post.user?.profile || null,
            likeCount: post._count.likes,
            commentCount: post._count.comments,
            shareCount: post._count.shares,
            isSaved: !!saved,
            isLike: !!liked,
            isFollow,
            isHide: !!hidden,
        };
    }
    async getAllPost(viewerUserId) {
        const posts = await this.prisma.post.findMany({
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        displayName: true,
                        image: true,
                        profile: true,
                    },
                },
                _count: {
                    select: {
                        likes: true,
                        comments: true,
                        shares: true,
                    },
                },
            },
        });
        let savedSet = new Set();
        let likedSet = new Set();
        let followMap = {};
        let hiddenSet = new Set();
        if (viewerUserId) {
            const saved = await this.prisma.savePost.findMany({
                where: { userId: viewerUserId, postId: { in: posts.map(p => p.id) } },
                select: { postId: true },
            });
            savedSet = new Set(saved.map(s => s.postId));
            const liked = await this.prisma.postLike.findMany({
                where: { userId: viewerUserId, postId: { in: posts.map(p => p.id) } },
                select: { postId: true },
            });
            likedSet = new Set(liked.map(l => l.postId));
            const authorIds = Array.from(new Set(posts.map(p => p.userId)));
            if (authorIds.length > 0) {
                const follows = await this.prisma.followerAndFollowing.findMany({
                    where: { followerId: viewerUserId, followingId: { in: authorIds }, status: 'ACCEPTED' },
                    select: { followingId: true },
                });
                followMap = follows.reduce((acc, f) => { acc[f.followingId] = true; return acc; }, {});
            }
            if (posts.length > 0) {
                const hidden = await this.prisma.hidePost.findMany({
                    where: { userId: viewerUserId, postId: { in: posts.map(p => p.id) } },
                    select: { postId: true },
                });
                hiddenSet = new Set(hidden.map(h => h.postId));
            }
        }
        return posts.map(post => ({
            id: post.id,
            text: post.text,
            images: post.images,
            caption: post.caption,
            hashtag: post.hashtag,
            location: post.location,
            music: post.music,
            taggedPeople: post.taggedPeople,
            createdAt: post.createdAt,
            updatedAt: post.updatedAt,
            deletedAt: post.deletedAt,
            userId: post.userId,
            userName: post.user?.displayName || null,
            userImage: post.user?.image || null,
            profile: post.user?.profile || null,
            likeCount: post._count.likes,
            commentCount: post._count.comments,
            shareCount: post._count.shares,
            isSaved: savedSet.has(post.id),
            isLike: likedSet.has(post.id),
            isFollow: !!followMap[post.userId],
            isHide: hiddenSet.has(post.id),
        }));
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
    async postLikeByUser(postId, userId) {
        if (!postId)
            throw new common_1.BadRequestException('Post ID required');
        if (!userId)
            throw new common_1.BadRequestException('User ID required');
        const post = await this.prisma.post.findUnique({
            where: {
                id: postId,
                deletedAt: null
            },
        });
        if (!post) {
            throw new common_1.BadRequestException('Post not found');
        }
        const existingLike = await this.prisma.postLike.findUnique({
            where: {
                postId_userId: {
                    postId,
                    userId,
                },
            },
        });
        if (existingLike) {
            await this.prisma.postLike.delete({
                where: {
                    postId_userId: {
                        postId,
                        userId,
                    },
                },
            });
            return { message: 'Post unliked successfully', liked: false };
        }
        else {
            await this.prisma.postLike.create({
                data: {
                    postId,
                    userId,
                },
            });
            return { message: 'Post liked successfully', liked: true };
        }
    }
    async postLikeList(postId) {
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
        const likes = await this.prisma.postLike.findMany({
            where: { postId },
            include: {
                user: {
                    select: {
                        id: true,
                        displayName: true,
                        image: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        const totalLikes = await this.prisma.postLike.count({
            where: { postId },
        });
        const formattedLikes = likes.map((like) => ({
            id: like.id,
            userId: like.user.id,
            displayName: like.user.displayName,
            image: like.user.image,
            createdAt: like.createdAt,
        }));
        return {
            likes: formattedLikes,
            totalLikes,
        };
    }
    async commentOnPost(postId, userId, comment) {
        if (!postId)
            throw new common_1.BadRequestException('Post ID required');
        if (!userId)
            throw new common_1.BadRequestException('User ID required');
        if (!comment || comment.trim() === '')
            throw new common_1.BadRequestException('Comment required');
        const post = await this.prisma.post.findUnique({
            where: { id: postId, deletedAt: null },
        });
        if (!post)
            throw new common_1.BadRequestException('Post not found');
        return this.prisma.postComment.create({
            data: { postId, userId, comment },
        });
    }
    async editComment(commentId, userId, newComment) {
        if (!commentId)
            throw new common_1.BadRequestException('Comment ID required');
        if (!userId)
            throw new common_1.BadRequestException('User ID required');
        if (!newComment || newComment.trim() === '')
            throw new common_1.BadRequestException('New comment text required');
        const comment = await this.prisma.postComment.findUnique({ where: { id: commentId } });
        if (!comment)
            throw new common_1.BadRequestException('Comment not found');
        if (comment.userId !== userId)
            throw new common_1.BadRequestException('Not allowed to edit this comment');
        return this.prisma.postComment.update({
            where: { id: commentId },
            data: { comment: newComment },
        });
    }
    async getCommentListOnPost(postId) {
        if (!postId)
            throw new common_1.BadRequestException('Post ID required');
        const post = await this.prisma.post.findUnique({
            where: { id: postId, deletedAt: null },
        });
        if (!post)
            throw new common_1.BadRequestException('Post not found');
        const comments = await this.prisma.postComment.findMany({
            where: { postId },
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { displayName: true, image: true, id: true } },
            },
        });
        const commentCount = await this.prisma.postComment.count({ where: { postId } });
        return {
            comments: comments.map((c) => ({
                id: c.id,
                comment: c.comment,
                createdAt: c.createdAt,
                userId: c.userId,
                displayName: c.user.displayName,
                image: c.user.image,
            })),
            commentCount,
        };
    }
    async commentDelete(postId, commentId, userId) {
        if (!postId)
            throw new common_1.BadRequestException('Post ID required');
        if (!commentId)
            throw new common_1.BadRequestException('Comment ID required');
        if (!userId)
            throw new common_1.BadRequestException('User ID required');
        const comment = await this.prisma.postComment.findUnique({ where: { id: commentId } });
        if (!comment || comment.userId !== userId || comment.postId !== postId)
            throw new common_1.BadRequestException('Not allowed');
        await this.prisma.postComment.delete({ where: { id: commentId } });
        return { message: 'Comment deleted' };
    }
    async getSavedPostsByUser(userId, viewerUserId) {
        if (!userId)
            throw new common_1.BadRequestException('User ID required');
        const savedPosts = await this.prisma.savePost.findMany({
            where: { userId, post: { deletedAt: null } },
            orderBy: { createdAt: 'desc' },
            include: {
                post: {
                    include: {
                        user: {
                            select: {
                                displayName: true,
                                image: true,
                            },
                        },
                        _count: {
                            select: {
                                likes: true,
                                comments: true,
                                shares: true,
                            },
                        },
                    },
                },
            },
        });
        let savedSet = new Set();
        let likedSet = new Set();
        if (viewerUserId) {
            const postIds = savedPosts.map(sp => sp.postId);
            const saved = await this.prisma.savePost.findMany({
                where: { userId: viewerUserId, postId: { in: postIds } },
                select: { postId: true },
            });
            savedSet = new Set(saved.map(s => s.postId));
            const liked = await this.prisma.postLike.findMany({
                where: { userId: viewerUserId, postId: { in: postIds } },
                select: { postId: true },
            });
            likedSet = new Set(liked.map(l => l.postId));
            const authorIds = Array.from(new Set(savedPosts.map(sp => sp.post.userId)));
            const follows = await this.prisma.followerAndFollowing.findMany({
                where: { followerId: viewerUserId, followingId: { in: authorIds }, status: 'ACCEPTED' },
                select: { followingId: true },
            });
            var followMap = follows.reduce((acc, f) => { acc[f.followingId] = true; return acc; }, {});
        }
        return savedPosts.map(sp => {
            const post = sp.post;
            return {
                id: post.id,
                text: post.text,
                images: post.images,
                caption: post.caption,
                hashtag: post.hashtag,
                location: post.location,
                music: post.music,
                taggedPeople: post.taggedPeople,
                createdAt: post.createdAt,
                updatedAt: post.updatedAt,
                deletedAt: post.deletedAt,
                userId: post.userId,
                userName: post.user?.displayName || null,
                userImage: post.user?.image || null,
                likeCount: post._count.likes,
                commentCount: post._count.comments,
                shareCount: post._count.shares,
                isSaved: savedSet.has(post.id),
                isLike: likedSet.has(post.id),
                isFollow: !!(typeof followMap !== 'undefined' && followMap[post.userId]),
            };
        });
    }
    async sharePostToUser(postId, sharedUserId, receiverUserId) {
        if (!postId)
            throw new common_1.BadRequestException('Post ID required');
        if (!sharedUserId)
            throw new common_1.BadRequestException('Sender user ID required');
        if (!receiverUserId)
            throw new common_1.BadRequestException('Receiver user ID required');
        const post = await this.prisma.post.findUnique({
            where: { id: postId, deletedAt: null },
        });
        if (!post)
            throw new common_1.BadRequestException('Post not found');
        if (sharedUserId === receiverUserId) {
            throw new common_1.BadRequestException('Cannot share post to yourself');
        }
        let conversation = await this.prisma.conversation.findFirst({
            where: {
                senderId: sharedUserId,
                receiverId: receiverUserId,
                postId,
                type: 'POST_SHARE',
            },
        });
        if (conversation) {
            return { message: 'Post already shared between these users', conversationId: conversation.id };
        }
        conversation = await this.prisma.conversation.create({
            data: {
                type: 'POST_SHARE',
                senderId: sharedUserId,
                receiverId: receiverUserId,
                postId,
            },
        });
        return { message: 'Post shared successfully', conversationId: conversation.id };
    }
    async getSharedPostList(userId) {
        if (!userId)
            throw new common_1.BadRequestException('User ID required');
        const conversations = await this.prisma.conversation.findMany({
            where: {
                OR: [
                    { senderId: userId },
                    { receiverId: userId },
                ],
                type: 'POST_SHARE',
            },
            orderBy: { createdAt: 'desc' },
            include: {
                post: {
                    include: {
                        user: { select: { displayName: true, image: true } },
                        _count: { select: { likes: true, comments: true, conversations: { where: { type: 'POST_SHARE' } } } },
                    },
                },
                sender: { select: { id: true, displayName: true, image: true } },
                receiver: { select: { id: true, displayName: true, image: true } },
            },
        });
        return conversations.map(conv => ({
            id: conv.id,
            sharedAt: conv.createdAt,
            post: conv.post && {
                id: conv.post.id,
                text: conv.post.text,
                images: conv.post.images,
                caption: conv.post.caption,
                hashtag: conv.post.hashtag,
                location: conv.post.location,
                music: conv.post.music,
                taggedPeople: conv.post.taggedPeople,
                createdAt: conv.post.createdAt,
                updatedAt: conv.post.updatedAt,
                deletedAt: conv.post.deletedAt,
                userId: conv.post.userId,
                userName: conv.post.user?.displayName || null,
                userImage: conv.post.user?.image || null,
                likeCount: conv.post._count.likes,
                commentCount: conv.post._count.comments,
                shareCount: conv.post._count.conversations,
            },
            sharedBy: conv.sender && {
                id: conv.sender.id,
                displayName: conv.sender.displayName,
                image: conv.sender.image,
            },
            receivedBy: conv.receiver && {
                id: conv.receiver.id,
                displayName: conv.receiver.displayName,
                image: conv.receiver.image,
            },
        }));
    }
    async deleteSharedPosts(shareIds, userId) {
        if (!Array.isArray(shareIds) || shareIds.length === 0)
            throw new common_1.BadRequestException('Share IDs required');
        if (!userId)
            throw new common_1.BadRequestException('User ID required');
        const conversations = await this.prisma.conversation.findMany({
            where: { id: { in: shareIds }, type: 'POST_SHARE' },
        });
        const deletableIds = conversations
            .filter(conv => conv.senderId === userId || conv.receiverId === userId)
            .map(conv => conv.id);
        if (deletableIds.length === 0)
            throw new common_1.BadRequestException('No authorized shared posts to delete');
        await this.prisma.conversation.deleteMany({
            where: { id: { in: deletableIds }, type: 'POST_SHARE' },
        });
        return { message: 'Shared posts deleted successfully', deletedIds: deletableIds };
    }
    async hidePost(postId, userId) {
        if (!postId || !userId)
            throw new common_1.BadRequestException('Post ID and User ID required');
        return this.prisma.hidePost.upsert({
            where: { postId_userId: { postId, userId } },
            update: {},
            create: { postId, userId },
        });
    }
    async unhidePost(postId, userId) {
        if (!postId || !userId)
            throw new common_1.BadRequestException('Post ID and User ID required');
        await this.prisma.hidePost.deleteMany({ where: { postId, userId } });
        return { message: 'Post unhidden successfully' };
    }
    async getHidePost(userId) {
        if (!userId)
            throw new common_1.BadRequestException('User ID required');
        const hidden = await this.prisma.hidePost.findMany({
            where: { userId },
            include: { post: true },
        });
        return hidden.map(h => h.post);
    }
    async sendMessage(senderId, receiverId, message) {
        if (!senderId)
            throw new common_1.BadRequestException('Sender ID required');
        if (!receiverId)
            throw new common_1.BadRequestException('Receiver ID required');
        if (!message || message.trim() === '')
            throw new common_1.BadRequestException('Message required');
        if (senderId === receiverId) {
            throw new common_1.BadRequestException('Cannot send message to yourself');
        }
        const conversation = await this.prisma.conversation.create({
            data: {
                type: 'CHAT',
                senderId,
                receiverId,
                content: message,
            },
        });
        return conversation;
    }
    async getConversations(userId) {
        if (!userId)
            throw new common_1.BadRequestException('User ID required');
        const conversations = await this.prisma.conversation.findMany({
            where: {
                OR: [
                    { senderId: userId },
                    { receiverId: userId },
                ],
            },
            orderBy: { createdAt: 'desc' },
            include: {
                sender: { select: { id: true, displayName: true, image: true } },
                receiver: { select: { id: true, displayName: true, image: true } },
                post: {
                    select: {
                        id: true,
                        text: true,
                        images: true,
                        caption: true,
                        user: { select: { displayName: true, image: true } }
                    }
                },
                story: {
                    select: {
                        id: true,
                        caption: true,
                        media: true,
                        user: { select: { displayName: true, image: true } }
                    }
                },
            },
        });
        return conversations.map(conv => ({
            id: conv.id,
            type: conv.type,
            content: conv.content,
            createdAt: conv.createdAt,
            sender: conv.sender,
            receiver: conv.receiver,
            post: conv.post,
            story: conv.story,
        }));
    }
    async getConversationWithUser(userId, otherUserId) {
        if (!userId)
            throw new common_1.BadRequestException('User ID required');
        if (!otherUserId)
            throw new common_1.BadRequestException('Other user ID required');
        const conversations = await this.prisma.conversation.findMany({
            where: {
                OR: [
                    { senderId: userId, receiverId: otherUserId },
                    { senderId: otherUserId, receiverId: userId },
                ],
            },
            orderBy: { createdAt: 'asc' },
            include: {
                sender: { select: { id: true, displayName: true, image: true } },
                receiver: { select: { id: true, displayName: true, image: true } },
                post: {
                    select: {
                        id: true,
                        text: true,
                        images: true,
                        caption: true,
                        user: { select: { displayName: true, image: true } }
                    }
                },
                story: {
                    select: {
                        id: true,
                        caption: true,
                        media: true,
                        user: { select: { displayName: true, image: true } }
                    }
                },
            },
        });
        return conversations.map(conv => ({
            id: conv.id,
            type: conv.type,
            content: conv.content,
            createdAt: conv.createdAt,
            sender: conv.sender,
            receiver: conv.receiver,
            post: conv.post,
            story: conv.story,
        }));
    }
};
exports.PostService = PostService;
exports.PostService = PostService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PostService);
//# sourceMappingURL=post.service.js.map