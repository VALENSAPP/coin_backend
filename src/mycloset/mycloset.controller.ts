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
  UseGuards,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { MyclosetService } from './mycloset.service';
import { CreateMyclosetDto } from './dto/create-mycloset.dto';
import { UpdateMyclosetDto } from './dto/update-mycloset.dto';

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


  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Mycloset by ID' })
  async findById(@Param('id') id: string) {
    return this.myclosetService.findById(id);
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
