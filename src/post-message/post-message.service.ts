import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostMessageDto } from './dto/create-post-message.dto';
import { UpdatePostMessageDto } from './dto/update-post-message.dto';

@Injectable()
export class PostMessageService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) throw new BadRequestException('User not found');
    return user;
  }

  async upsertMine(userId: string, dto: CreatePostMessageDto) {
    await this.ensureUser(userId);
    return this.prisma.postMessage.upsert({
      where: { userId },
      create: {
        userId,
        ...dto,
      },
      update: {
        ...dto,
      },
    });
  }

  async findMine(userId: string) {
    return this.findByUserId(userId);
  }

  async findByUserId(userId: string) {
    const postMessage = await this.prisma.postMessage.findUnique({
      where: { userId },
    });
    if (!postMessage) throw new NotFoundException('Post message not found');
    return postMessage;
  }

  async updateMine(userId: string, dto: UpdatePostMessageDto) {
    await this.findMine(userId);
    return this.prisma.postMessage.update({
      where: { userId },
      data: dto,
    });
  }

  async removeMine(userId: string) {
    await this.findMine(userId);
    return this.prisma.postMessage.delete({
      where: { userId },
    });
  }
}
