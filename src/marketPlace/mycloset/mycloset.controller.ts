import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { MyclosetService } from './mycloset.service';
import { CreateMyclosetDto } from './dto/create-mycloset.dto';
import { UpdateMyclosetDto } from './dto/update-mycloset.dto';
import { CreateClosetItemDto } from './dto/create-closet-item.dto';
import { UpdateClosetItemDto } from './dto/update-closet-item.dto';
import { FindClosetByUserDto } from './dto/find-closet-by-user.dto';

@ApiTags('mycloset')
@Controller('mycloset')
export class MyclosetController {
  constructor(private readonly myclosetService: MyclosetService) { }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('shopLogo'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create Mycloset for the authenticated user' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['shopName', 'shopUsername', 'whoCanBuy', 'shippingOptions'],
      properties: {
        shopName: { type: 'string' },
        shopUsername: { type: 'string' },
        shopLogo: { type: 'string', format: 'binary' },
        description: { type: 'string' },
        shopCategory: { type: 'string' },
        location: { type: 'string' },
        whoCanBuy: { type: 'string', enum: ['Everyone', 'followers'] },
        paymentMethod: { type: 'string' },
        shippingOptions: { type: 'string', enum: ['ship_items', 'local_pick'] },
        returnPolicy: { type: 'string' },
      },
    },
  })
  async create(
    @Req() req: Request,
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: CreateMyclosetDto,
    @UploadedFile() shopLogo?: Express.Multer.File,
  ) {
    const userId = (req.user as any)?.userId;
    return this.myclosetService.create(userId, dto, shopLogo);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get authenticated user Mycloset' })
  async findMine(@Req() req: Request) {
    const userId = (req.user as any)?.userId;
    return this.myclosetService.findMine(userId);
  }

  @Post('items')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @UseInterceptors(FilesInterceptor('images', 20))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a closet item with multiple images' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['category', 'condition', 'price', 'shippingOption'],
      properties: {
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
        name: { type: 'string' },
        category: { type: 'string' },
        brand: { type: 'string' },
        condition: { type: 'string', enum: ['New', 'Used', 'Good_condition', 'Need_attention'] },
        description: { type: 'string' },
        price: { type: 'number' },
        quantity: { type: 'integer', default: 1 },
        shippingOption: { type: 'string', enum: ['ship_items', 'local_pick'] },
        ahippingOption: { type: 'string', enum: ['ship_items', 'local_pick'], description: 'Accepted for typo compatibility.' },
        estimateShippingTime: { type: 'string' },
        returnPolicy: { type: 'string' },
      },
    },
  })
  async createItem(
    @Req() req: Request,
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: CreateClosetItemDto,
    @UploadedFiles() images?: Express.Multer.File[],
  ) {
    const userId = (req.user as any)?.userId;
    return this.myclosetService.createItem(userId, dto, images);
  }

  @Get('items')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get authenticated user closet items' })
  async findMyItems(@Req() req: Request) {
    const userId = (req.user as any)?.userId;
    return this.myclosetService.findMyItems(userId);
  }

  @Get('items/:itemId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiParam({ name: 'itemId', type: 'string' })
  @ApiOperation({ summary: 'Get one authenticated user closet item' })
  async findItemById(@Req() req: Request, @Param('itemId') itemId: string) {
    const userId = (req.user as any)?.userId;
    return this.myclosetService.findItemById(userId, itemId);
  }

  @Patch('items/:itemId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @UseInterceptors(FilesInterceptor('images', 20))
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'itemId', type: 'string' })
  @ApiOperation({ summary: 'Update authenticated user closet item' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
        name: { type: 'string' },
        category: { type: 'string' },
        brand: { type: 'string' },
        condition: { type: 'string', enum: ['New', 'Used', 'Good_condition', 'Need_attention'] },
        description: { type: 'string' },
        price: { type: 'number' },
        quantity: { type: 'integer' },
        shippingOption: { type: 'string', enum: ['ship_items', 'local_pick'] },
        ahippingOption: { type: 'string', enum: ['ship_items', 'local_pick'], description: 'Accepted for typo compatibility.' },
        estimateShippingTime: { type: 'string' },
        returnPolicy: { type: 'string' },
      },
    },
  })
  async updateItem(
    @Req() req: Request,
    @Param('itemId') itemId: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: UpdateClosetItemDto,
    @UploadedFiles() images?: Express.Multer.File[],
  ) {
    if (!Object.keys(dto).length && !images?.length) {
      throw new BadRequestException('No data provided for update');
    }
    const userId = (req.user as any)?.userId;
    return this.myclosetService.updateItem(userId, itemId, dto, images);
  }

  @Delete('items/:itemId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiParam({ name: 'itemId', type: 'string' })
  @ApiOperation({ summary: 'Delete authenticated user closet item' })
  async removeItem(@Req() req: Request, @Param('itemId') itemId: string) {
    const userId = (req.user as any)?.userId;
    return this.myclosetService.removeItem(userId, itemId);
  }

  @Get(':closetId/items')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiParam({ name: 'closetId', type: 'string' })
  @ApiOperation({ summary: 'Get all closet items by Mycloset ID' })
  async findItemsByClosetId(@Param('closetId') closetId: string) {
    return this.myclosetService.findItemsByClosetId(closetId);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Mycloset by ID' })
  async findById(@Param('id') id: string) {
    return this.myclosetService.findById(id);
  }

  @Post('by-user')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Mycloset by user ID' })
  async findByUserId(
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: FindClosetByUserDto,
  ) {
    return this.myclosetService.findByUserId(dto.userId);
  }

  @Patch()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('shopLogo'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update authenticated user Mycloset' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        shopName: { type: 'string' },
        shopUsername: { type: 'string' },
        shopLogo: { type: 'string', format: 'binary' },
        description: { type: 'string' },
        shopCategory: { type: 'string' },
        location: { type: 'string' },
        whoCanBuy: { type: 'string', enum: ['Everyone', 'followers'] },
        paymentMethod: { type: 'string' },
        shippingOptions: { type: 'string', enum: ['ship_items', 'local_pick'] },
        returnPolicy: { type: 'string' },
      },
    },
  })
  async update(
    @Req() req: Request,
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: UpdateMyclosetDto,
    @UploadedFile() shopLogo?: Express.Multer.File,
  ) {
    if (!Object.keys(dto).length && !shopLogo) {
      throw new BadRequestException('No data provided for update');
    }
    const userId = (req.user as any)?.userId;
    return this.myclosetService.update(userId, dto, shopLogo);
  }

  @Delete()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete authenticated user Mycloset' })
  async remove(@Req() req: Request) {
    const userId = (req.user as any)?.userId;
    return this.myclosetService.remove(userId);
  }
}
