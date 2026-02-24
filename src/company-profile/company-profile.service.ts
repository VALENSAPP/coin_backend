import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { uploadImageToS3 } from '../common/s3.util';
import { CreateCompanyProfileDto } from './dto/create-company-profile.dto';
import { UpdateCompanyProfileDto } from './dto/update-company-profile.dto';

const COMPANY_DOCUMENTS_FOLDER = 'company-documents';

@Injectable()
export class CompanyProfileService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureCompanyUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, profile: true },
    });
    if (!user) throw new BadRequestException('User not found');
    if (user.profile !== 'company') {
      throw new BadRequestException('Only users with company profile can manage company details.');
    }
    return user;
  }

  async create(userId: string, dto: CreateCompanyProfileDto) {
    await this.ensureCompanyUser(userId);
    const existing = await this.prisma.companyProfile.findUnique({
      where: { userId },
    });
    if (existing) {
      throw new BadRequestException('Company profile already exists. Use update instead.');
    }
    return this.prisma.companyProfile.create({
      data: {
        userId,
        businessName: dto.businessName,
        ownerName: dto.ownerName,
        email: dto.email,
        phone: dto.phone,
        category: dto.category,
        address: dto.address,
        description: dto.description,
        website: dto.website,
        gstNumber: dto.gstNumber,
      },
    });
  }

  async findOneByUserId(userId: string) {
    await this.ensureCompanyUser(userId);
    const profile = await this.prisma.companyProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new BadRequestException('Company profile not found.');
    return profile;
  }

  async findByUserIdPublic(userId: string) {
    const profile = await this.prisma.companyProfile.findUnique({
      where: { userId },
    });
    return profile;
  }

  async update(userId: string, dto: UpdateCompanyProfileDto) {
    await this.ensureCompanyUser(userId);
    const existing = await this.prisma.companyProfile.findUnique({
      where: { userId },
    });
    if (!existing) throw new BadRequestException('Company profile not found. Create one first.');
    return this.prisma.companyProfile.update({
      where: { userId },
      data: {
        businessName: dto.businessName,
        ownerName: dto.ownerName,
        email: dto.email,
        phone: dto.phone,
        category: dto.category,
        address: dto.address,
        description: dto.description,
        website: dto.website,
        gstNumber: dto.gstNumber,
      },
    });
  }

  async remove(userId: string) {
    await this.ensureCompanyUser(userId);
    const existing = await this.prisma.companyProfile.findUnique({
      where: { userId },
    });
    if (!existing) throw new BadRequestException('Company profile not found.');
    return this.prisma.companyProfile.delete({
      where: { userId },
    });
  }

  async uploadDocument(userId: string, file: Express.Multer.File) {
    await this.ensureCompanyUser(userId);
    const url = await uploadImageToS3(file, COMPANY_DOCUMENTS_FOLDER);
    const profile = await this.prisma.companyProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      await this.prisma.companyProfile.create({
        data: { userId, documentUrls: [url] },
      });
      return { url, documentUrls: [url] };
    }
    const documentUrls = [...profile.documentUrls, url];
    await this.prisma.companyProfile.update({
      where: { userId },
      data: { documentUrls },
    });
    return { url, documentUrls };
  }

  async uploadDocuments(userId: string, files: Express.Multer.File[]) {
    await this.ensureCompanyUser(userId);
    if (!files?.length) throw new BadRequestException('No files provided.');
    const urls = await Promise.all(
      files.map((file) => uploadImageToS3(file, COMPANY_DOCUMENTS_FOLDER)),
    );
    const profile = await this.prisma.companyProfile.findUnique({
      where: { userId },
    });
    const existingUrls = profile?.documentUrls ?? [];
    const documentUrls = [...existingUrls, ...urls];
    if (!profile) {
      await this.prisma.companyProfile.create({
        data: { userId, documentUrls },
      });
    } else {
      await this.prisma.companyProfile.update({
        where: { userId },
        data: { documentUrls },
      });
    }
    return { urls, documentUrls };
  }

  async removeDocumentUrl(userId: string, documentUrl: string) {
    await this.ensureCompanyUser(userId);
    const profile = await this.prisma.companyProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new BadRequestException('Company profile not found.');
    const documentUrls = profile.documentUrls.filter((u: string) => u !== documentUrl);
    await this.prisma.companyProfile.update({
      where: { userId },
      data: { documentUrls },
    });
    return { documentUrls };
  }
}
