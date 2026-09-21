import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ModerationModule } from '../../moderation/moderation.module';
import { MyclosetController } from './mycloset.controller';
import { MyclosetService } from './mycloset.service';

@Module({
  imports: [PrismaModule, ModerationModule],
  controllers: [MyclosetController],
  providers: [MyclosetService],
  exports: [MyclosetService],
})
export class MyclosetModule { }
