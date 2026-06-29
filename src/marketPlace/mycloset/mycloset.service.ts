import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { uploadImageToS3 } from '../../common/s3.util';
import { CreateMyclosetDto } from './dto/create-mycloset.dto';
import { UpdateMyclosetDto } from './dto/update-mycloset.dto';
import { CreateClosetItemDto } from './dto/create-closet-item.dto';
import { UpdateClosetItemDto } from './dto/update-closet-item.dto';

const MYCLOSET_LOGOS_FOLDER = 'mycloset-logos';
const CLOSET_ITEMS_FOLDER = 'closet-items';

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

  private async uploadItemImages(files?: Express.Multer.File[]): Promise<string[] | undefined> {
    if (!files?.length) return undefined;

    const invalidFile = files.find((file) => !file.mimetype?.startsWith('image/'));
    if (invalidFile) {
      throw new BadRequestException('images must contain only image files');
    }

    return Promise.all(files.map((file) => uploadImageToS3(file, CLOSET_ITEMS_FOLDER)));
  }

  private resolveShippingOption(dto: Pick<CreateClosetItemDto, 'shippingOption' | 'ahippingOption'>) {
    return dto.shippingOption || dto.ahippingOption;
  }

  private getItemName(dto: Pick<CreateClosetItemDto, 'name' | 'category'>) {
    return dto.name || dto.category;
  }

  private async findMineOrThrow(userId: string) {
    const closet = await this.prisma.mycloset.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!closet) throw new NotFoundException('Mycloset not found');
    return closet;
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

  async findByUserId(userId: string) {
    if (!userId) throw new BadRequestException('User ID required');

    const closet = await this.prisma.mycloset.findUnique({
      where: { userId },
    });

    if (!closet) throw new NotFoundException('Mycloset not found');

    return {
      closetId: closet.id,
      closetDetails: closet,
    };
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

  async createItem(userId: string, dto: CreateClosetItemDto, imageFiles?: Express.Multer.File[]) {
    if (!userId) throw new BadRequestException('User ID required');

    const shippingOption = this.resolveShippingOption(dto);
    if (!shippingOption) throw new BadRequestException('shippingOption is required');

    const closet = await this.findMineOrThrow(userId);
    const images = (await this.uploadItemImages(imageFiles)) || [];

    return this.prisma.closetItems.create({
      data: {
        closetId: closet.id,
        userId,
        images,
        name: this.getItemName(dto),
        category: dto.category,
        brand: dto.brand,
        condition: dto.condition,
        description: dto.description,
        price: dto.price,
        quantity: dto.quantity ?? 1,
        shippingOption,
        estimateShippingTime: dto.estimateShippingTime,
        returnPolicy: dto.returnPolicy,
      },
    });
  }

  async findMyItems(userId: string) {
    if (!userId) throw new BadRequestException('User ID required');
    await this.findMineOrThrow(userId);

    return this.prisma.closetItems.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findItemsByClosetId(closetId: string) {
    if (!closetId) throw new BadRequestException('Mycloset ID required');

    const closet = await this.prisma.mycloset.findUnique({
      where: { id: closetId },
      select: { id: true },
    });
    if (!closet) throw new NotFoundException('Mycloset not found');

    return this.prisma.closetItems.findMany({
      where: { closetId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findItemById(userId: string, itemId: string) {
    if (!userId) throw new BadRequestException('User ID required');
    if (!itemId) throw new BadRequestException('Closet item ID required');

    const item = await this.prisma.closetItems.findFirst({
      where: { id: itemId, userId },
    });
    if (!item) throw new NotFoundException('Closet item not found');
    return item;
  }

  async updateItem(userId: string, itemId: string, dto: UpdateClosetItemDto, imageFiles?: Express.Multer.File[]) {
    if (!userId) throw new BadRequestException('User ID required');
    if (!itemId) throw new BadRequestException('Closet item ID required');

    await this.findItemById(userId, itemId);
    const images = await this.uploadItemImages(imageFiles);
    const shippingOption = this.resolveShippingOption(dto);

    return this.prisma.closetItems.update({
      where: { id: itemId },
      data: {
        ...(images !== undefined && { images }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.name === undefined && dto.category !== undefined && { name: this.getItemName(dto as CreateClosetItemDto) }),
        ...(dto.brand !== undefined && { brand: dto.brand }),
        ...(dto.condition !== undefined && { condition: dto.condition }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.quantity !== undefined && { quantity: dto.quantity }),
        ...(shippingOption !== undefined && { shippingOption }),
        ...(dto.estimateShippingTime !== undefined && { estimateShippingTime: dto.estimateShippingTime }),
        ...(dto.returnPolicy !== undefined && { returnPolicy: dto.returnPolicy }),
      },
    });
  }

  async removeItem(userId: string, itemId: string) {
    if (!userId) throw new BadRequestException('User ID required');
    if (!itemId) throw new BadRequestException('Closet item ID required');

    await this.findItemById(userId, itemId);
    await this.prisma.closetItems.delete({
      where: { id: itemId },
    });
    return { message: 'Closet item deleted successfully' };
  }
}
