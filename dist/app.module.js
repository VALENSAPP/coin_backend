"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const user_module_1 = require("./user/user.module");
const auth_module_1 = require("./auth/auth.module");
const post_module_1 = require("./post/post.module");
const story_module_1 = require("./story/story.module");
const schedule_1 = require("@nestjs/schedule");
const billing_module_1 = require("./billing/billing.module");
const token_module_1 = require("./token/token.module");
const token_purchase_module_1 = require("./token-purchase/token-purchase.module");
const kyc_module_1 = require("./kyc/kyc.module");
const notification_module_1 = require("./notification/notification.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
            schedule_1.ScheduleModule.forRoot(),
            post_module_1.PostModule,
            user_module_1.UserModule,
            auth_module_1.AuthModule,
            story_module_1.StoryModule,
            billing_module_1.BillingModule,
            token_module_1.TokenModule,
            token_purchase_module_1.TokenPurchaseModule,
            kyc_module_1.KycModule,
            notification_module_1.NotificationModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map