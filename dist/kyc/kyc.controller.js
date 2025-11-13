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
let KycController = class KycController {
    kycService;
    constructor(kycService) {
        this.kycService = kycService;
    }
    async startKyc(userId, documentType, firstName, lastName) {
        return this.kycService.createVeriffSession(userId, documentType, firstName, lastName);
    }
    async handleWebhook(req) {
        let body = req.body;
        if (Buffer.isBuffer(body)) {
            body = JSON.parse(body.toString());
        }
        console.log('📨 RAW VERIFF PAYLOAD:', JSON.stringify(body, null, 2));
        const verification = body.resource || body.verification || body;
        console.log('✅ Extracted verification object:', JSON.stringify(verification, null, 2));
        const id = verification?.id;
        const action = verification?.action;
        const code = verification?.code;
        console.log(`🔍 Webhook data - ID: ${id}, Action: ${action}, Code: ${code}`);
        if (!id) {
            console.error('❌ Missing verification id in payload');
            return { success: false, message: 'Invalid payload structure', body };
        }
        await this.kycService.handleWebhook(verification);
        return { success: true };
    }
    async getStatus(userId) {
        return this.kycService.getKycStatus(userId);
    }
    async syncStatus(userId) {
        return this.kycService.syncKycStatus(userId);
    }
    async syncAllPending() {
        return this.kycService.syncAllPendingKyc();
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
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], KycController.prototype, "handleWebhook", null);
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
__decorate([
    (0, common_1.Post)('sync/:userId'),
    (0, swagger_1.ApiOperation)({ summary: 'Sync KYC status with Veriff API' }),
    (0, swagger_1.ApiParam)({ name: 'userId', description: 'User ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'KYC status synced successfully' }),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], KycController.prototype, "syncStatus", null);
__decorate([
    (0, common_1.Post)('sync-all'),
    (0, swagger_1.ApiOperation)({ summary: 'Sync all pending/submitted KYC records with Veriff API' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'All pending KYC records synced successfully' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], KycController.prototype, "syncAllPending", null);
exports.KycController = KycController = __decorate([
    (0, swagger_1.ApiTags)('KYC'),
    (0, common_1.Controller)('kyc'),
    __metadata("design:paramtypes", [kyc_service_1.KycService])
], KycController);
//# sourceMappingURL=kyc.controller.js.map