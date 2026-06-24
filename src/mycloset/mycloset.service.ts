import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { uploadImageToS3 } from '../common/s3.util';
import { CreateMyclosetDto } from './dto/create-mycloset.dto';
import { UpdateMyclosetDto } from './dto/update-mycloset.dto';

const MYCLOSET_LOGOS_FOLDER = 'mycloset-logos';

@Injectable()
export class MyclosetService {
  constructor(private readonly prisma: PrismaService) { }

  private async uploadLogoIfProvided(file?: Express.Multer.File): Promise<string | undefined> {
    if (!file) return undefined;
    if (!file.mimetype?.startsWith('image/')) {
      throw new BadRequestException('shopLogo must be an image file');
    }
    return uploadImageToS3(file, MYCLOSET_LOGOS_FOLDER);
  }

  private handleUniqueError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = Array.isArray(error.meta?.target) ? error.meta?.target.join(', ') : String(error.meta?.target || '');
      if (target.includes('shopUsername')) {
        throw new BadRequestException('shopUsername already exists');
      }
      if (target.includes('userId')) {
        throw new BadRequestException('Mycloset already exists for this user');
      }
      throw new BadRequestException('Unique constraint failed');
    }
    throw error;
  }

  async create(userId: string, dto: CreateMyclosetDto, logoFile?: Express.Multer.File) {
    if (!userId) throw new BadRequestException('User ID required');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const shopLogo = await this.uploadLogoIfProvided(logoFile);

    try {
      return await this.prisma.mycloset.create({
        data: {
          userId,
          shopName: dto.shopName,
          shopUsername: dto.shopUsername,
          shopLogo,
          description: dto.description,
          shopCategory: dto.shopCategory,
          location: dto.location,
          whoCanBuy: dto.whoCanBuy,
          paymentMethod: dto.paymentMethod,
          shippingOptions: dto.shippingOptions,
          returnPolicy: dto.returnPolicy,
        },
      });
    } catch (error) {
      this.handleUniqueError(error);
    }
  }

  async findMine(userId: string) {
    if (!userId) throw new BadRequestException('User ID required');
    const closet = await this.prisma.mycloset.findUnique({
      where: { userId },
    });
    if (!closet) throw new NotFoundException('Mycloset not found');
    return closet;
  }

  async findById(id: string) {
    if (!id) throw new BadRequestException('Mycloset ID required');
    const closet = await this.prisma.mycloset.findUnique({
      where: { id },
    });
    if (!closet) throw new NotFoundException('Mycloset not found');
    return closet;
  }



  async update(userId: string, dto: UpdateMyclosetDto, logoFile?: Express.Multer.File) {
    if (!userId) throw new BadRequestException('User ID required');

    const existing = await this.prisma.mycloset.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Mycloset not found');

    const shopLogo = await this.uploadLogoIfProvided(logoFile);

    try {
      return await this.prisma.mycloset.update({
        where: { userId },
        data: {
          ...(dto.shopName !== undefined && { shopName: dto.shopName }),
          ...(dto.shopUsername !== undefined && { shopUsername: dto.shopUsername }),
          ...(shopLogo !== undefined && { shopLogo }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.shopCategory !== undefined && { shopCategory: dto.shopCategory }),
          ...(dto.location !== undefined && { location: dto.location }),
          ...(dto.whoCanBuy !== undefined && { whoCanBuy: dto.whoCanBuy }),
          ...(dto.paymentMethod !== undefined && { paymentMethod: dto.paymentMethod }),
          ...(dto.shippingOptions !== undefined && { shippingOptions: dto.shippingOptions }),
          ...(dto.returnPolicy !== undefined && { returnPolicy: dto.returnPolicy }),
        },
      });
    } catch (error) {
      this.handleUniqueError(error);
    }
  }

  async remove(userId: string) {
    if (!userId) throw new BadRequestException('User ID required');
    const existing = await this.prisma.mycloset.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Mycloset not found');
    await this.prisma.mycloset.delete({
      where: { userId },
    });
    return { message: 'Mycloset deleted successfully' };
  }
}
