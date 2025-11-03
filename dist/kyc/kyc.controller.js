"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KycController = void 0;
const common_1 = require("@nestjs/common");
const kyc_service_1 = require("./kyc.service");
const swagger_1 = require("@nestjs/swagger");
const webhook_dto_1 = require("./dto/webhook.dto");
let KycController = class KycController {
    kycService;
    constructor(kycService) {
        this.kycService = kycService;
    }
    async startKyc(userId, documentType, firstName, lastName) {
        return this.kycService.createVeriffSession(userId, documentType, firstName, lastName);
    }
    async webhook(body) {
        return this.kycService.handleWebhook(body);
    }
    async getStatus(userId) {
        return this.kycService.getKycStatus(userId);
    }
};
exports.KycController = KycController;
__decorate([
    (0, common_1.Post)('start/:userId'),
    (0, swagger_1.ApiOperation)({ summary: 'Start KYC verification' }),
    (0, swagger_1.ApiParam)({ name: 'userId', description: 'User ID' }),
    (0, swagger_1.ApiBody)({ schema: {
            type: 'object',
            properties: {
                documentType: { type: 'string', example: 'DRIVERS_LICENSE' },
                firstName: { type: 'string', example: 'John' },
                lastName: { type: 'string', example: 'Doe' }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Veriff session created successfully' }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Body)('documentType')),
    __param(2, (0, common_1.Body)('firstName')),
    __param(3, (0, common_1.Body)('lastName')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], KycController.prototype, "startKyc", null);
__decorate([
    (0, common_1.Post)('webhook'),
    (0, swagger_1.ApiOperation)({ summary: 'Veriff Webhook' }),
    (0, swagger_1.ApiBody)({ type: webhook_dto_1.VeriffWebhookDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Webhook handled successfully' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [webhook_dto_1.VeriffWebhookDto]),
    __metadata("design:returntype", Promise)
], KycController.prototype, "webhook", null);
__decorate([
    (0, common_1.Get)('status/:userId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get KYC status' }),
    (0, swagger_1.ApiParam)({ name: 'userId', description: 'User ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'KYC status fetched successfully' }),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], KycController.prototype, "getStatus", null);
exports.KycController = KycController = __decorate([
    (0, swagger_1.ApiTags)('KYC'),
    (0, common_1.Controller)('kyc'),
    __metadata("design:paramtypes", [kyc_service_1.KycService])
], KycController);
//# sourceMappingURL=kyc.controller.js.map