import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { PostModule } from './post/post.module';
import { StoryModule } from './story/story.module';
import { ScheduleModule } from '@nestjs/schedule';
import { BillingModule } from './billing/billing.module';
import { TokenModule } from './token/token.module';
import { TokenPurchaseModule } from './token-purchase/token-purchase.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ScheduleModule.forRoot(),
    PostModule,
    UserModule,
    AuthModule,
    StoryModule,
    BillingModule,
    TokenModule,
    TokenPurchaseModule,
  ],
})
export class AppModule {}
