import { Module } from '@nestjs/common';
import { KycController } from './sumsubuser.controller';
import { KycService } from './sumsubuser.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [KycController],
  providers: [KycService],
  exports: [KycService],
})
export class SumsubUserVerificationModule {}
