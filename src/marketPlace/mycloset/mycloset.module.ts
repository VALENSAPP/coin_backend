import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { MyclosetController } from './mycloset.controller';
import { MyclosetService } from './mycloset.service';

@Module({
  imports: [PrismaModule],
  controllers: [MyclosetController],
  providers: [MyclosetService],
  exports: [MyclosetService],
})
export class MyclosetModule { }
