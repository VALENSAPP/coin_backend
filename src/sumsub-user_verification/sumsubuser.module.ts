
import { Module, forwardRef } from '@nestjs/common';
import { KycController } from './sumsubuser.controller';
import { KycService } from './sumsubuser.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, forwardRef(() => AuthModule)],
  controllers: [KycController],
  providers: [KycService],
  exports: [KycService],
})
export class KycModule {}