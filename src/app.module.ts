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
import { KycModule } from './kyc/kyc.module';
import { CompanyProfileModule } from './company-profile/company-profile.module';
import { SumsubVerificationModule } from './sumsub-verification/sumsub-verification.module';
import { SumsubUserVerificationModule } from './sumsub-user_verification/sumsub-user_verification.module';
import { NotificationModule } from './notification/notification.module';
import { BattleModule } from './battle/battle.module';
import { PrivateCircleModule } from './private-circle/private-circle.module';
import { MyclosetModule } from './marketPlace/mycloset/mycloset.module';
import { CartModule } from './marketPlace/cart/cart.module';
import { AddressModule } from './marketPlace/address/address.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DeepLinkController } from './deep-link/deep-link.controller';
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
    KycModule,
    CompanyProfileModule,
    SumsubVerificationModule,
    SumsubUserVerificationModule,
    NotificationModule,
    BattleModule,
    PrivateCircleModule,
    MyclosetModule,
    CartModule,
    AddressModule,
  ],
  controllers: [AppController, DeepLinkController],
  providers: [AppService],
})
export class AppModule { }
