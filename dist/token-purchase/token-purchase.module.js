"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenPurchaseModule = void 0;
const common_1 = require("@nestjs/common");
const token_purchase_service_1 = require("./token-purchase.service");
const token_purchase_controller_1 = require("./token-purchase.controller");
const prisma_module_1 = require("../prisma/prisma.module");
const token_module_1 = require("../token/token.module");
const user_module_1 = require("../user/user.module");
let TokenPurchaseModule = class TokenPurchaseModule {
};
exports.TokenPurchaseModule = TokenPurchaseModule;
exports.TokenPurchaseModule = TokenPurchaseModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, token_module_1.TokenModule, user_module_1.UserModule],
        controllers: [token_purchase_controller_1.TokenPurchaseController],
        providers: [token_purchase_service_1.TokenPurchaseService],
        exports: [token_purchase_service_1.TokenPurchaseService],
    })
], TokenPurchaseModule);
//# sourceMappingURL=token-purchase.module.js.map