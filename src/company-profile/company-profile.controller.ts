import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { CompanyProfileService } from './company-profile.service';
import { CreateCompanyProfileDto } from './dto/create-company-profile.dto';
import { UpdateCompanyProfileDto } from './dto/update-company-profile.dto';

@ApiTags('company-profile')
@Controller('company-profile')
export class CompanyProfileController {
  constructor(private readonly companyProfileService: CompanyProfileService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create company profile (company users only)' })
  async create(@Req() req: Request, @Body() dto: CreateCompanyProfileDto) {
    const userId = (req.user as any).userId;
    return this.companyProfileService.create(userId, dto);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my company profile' })
  async getMine(@Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.companyProfileService.findOneByUserId(userId);
  }

  @Get('by-user/:userId')
  @ApiOperation({ summary: 'Get company profile by user ID (public)' })
  async getByUserId(@Param('userId') userId: string) {
    return this.companyProfileService.findByUserIdPublic(userId);
  }

  @Patch()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update my company profile' })
  async update(@Req() req: Request, @Body() dto: UpdateCompanyProfileDto) {
    const userId = (req.user as any).userId;
    return this.companyProfileService.update(userId, dto);
  }

  @Delete()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete my company profile' })
  async remove(@Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.companyProfileService.remove(userId);
  }

  @Post('upload-document')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('document'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        document: { type: 'string', format: 'binary', description: 'Company document (PDF, image, etc.)' },
      },
      required: ['document'],
    },
  })
  @ApiOperation({ summary: 'Upload one company document (S3 URL saved to profile)' })
  async uploadDocument(@Req() req: Request, @UploadedFile() file: Express.Multer.File) {
    const userId = (req.user as any).userId;
    if (!file) throw new BadRequestException('No file uploaded');
    return this.companyProfileService.uploadDocument(userId, file);
  }

  @Post('upload-documents')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @UseInterceptors(FileFieldsInterceptor([{ name: 'documents', maxCount: 10 }]))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        documents: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Multiple company documents',
        },
      },
      required: ['documents'],
    },
  })
  @ApiOperation({ summary: 'Upload multiple company documents (S3 URLs saved to profile)' })
  async uploadDocuments(
    @Req() req: Request,
    @UploadedFiles() files: { documents?: Express.Multer.File[] },
  ) {
    const userId = (req.user as any).userId;
    const documents = files?.documents ?? [];
    return this.companyProfileService.uploadDocuments(userId, documents);
  }

  @Delete('document')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiQuery({ name: 'url', description: 'Full S3 URL of the document to remove' })
  @ApiOperation({ summary: 'Remove a document URL from my company profile' })
  async removeDocument(@Req() req: Request, @Query('url') url: string) {
    const userId = (req.user as any).userId;
    if (!url) throw new BadRequestException('Query parameter "url" is required');
    return this.companyProfileService.removeDocumentUrl(userId, url);
  }
}
