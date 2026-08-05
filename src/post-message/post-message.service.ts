import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostMessageDto } from './dto/create-post-message.dto';
import { UpdatePostMessageDto } from './dto/update-post-message.dto';

@Injectable()
export class PostMessageService {
  constructor(private readonly prisma: PrismaService) {}

  async create(authUserId: string, dto: CreatePostMessageDto) {
    const userId = dto.userId || authUserId;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) throw new BadRequestException('User not found');

    const existing = await this.prisma.postMessage.findUnique({
      where: { userId },
    });
    if (existing) {
      throw new BadRequestException('Post message already exists for this user. Use update instead.');
    }

    return this.prisma.postMessage.create({
      data: {
        userId,
        messageForPhotos: dto.messageForPhotos,
        messageForVideos: dto.messageForVideos,
        messageForEbooks: dto.messageForEbooks,
      },
    });
  }

  async findAll() {
    return this.prisma.postMessage.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const postMessage = await this.prisma.postMessage.findUnique({
      where: { id },
    });
    if (!postMessage) throw new NotFoundException('Post message not found');
    return postMessage;
  }

  async findByUserId(userId: string) {
    const postMessage = await this.prisma.postMessage.findUnique({
      where: { userId },
    });
    if (!postMessage) throw new NotFoundException('Post message not found for this user');
    return postMessage;
  }

  async findMine(userId: string) {
    return this.findByUserId(userId);
  }

  async update(id: string, dto: UpdatePostMessageDto) {
    await this.findOne(id);
    const { userId, ...data } = dto;

    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });
      if (!user) throw new BadRequestException('User not found');

      const existing = await this.prisma.postMessage.findUnique({
        where: { userId },
      });
      if (existing && existing.id !== id) {
        throw new BadRequestException('Post message already exists for this user.');
      }
    }

    return this.prisma.postMessage.update({
      where: { id },
      data: {
        ...data,
        ...(userId ? { userId } : {}),
      },
    });
  }

  async updateMine(userId: string, dto: UpdatePostMessageDto) {
    const postMessage = await this.findByUserId(userId);
    return this.update(postMessage.id, { ...dto, userId: undefined });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.postMessage.delete({
      where: { id },
    });
  }

  async removeMine(userId: string) {
    const postMessage = await this.findByUserId(userId);
    return this.remove(postMessage.id);
  }
}
