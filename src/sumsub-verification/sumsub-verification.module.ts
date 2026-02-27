import { Module } from '@nestjs/common';
import { SumsubVerificationController } from './sumsub-verification.controller';
import { SumsubVerificationService } from './sumsub-verification.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SumsubVerificationController],
  providers: [SumsubVerificationService],
  exports: [SumsubVerificationService],
})
export class SumsubVerificationModule {}
