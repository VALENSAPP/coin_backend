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
Object.defineProperty(exports, "__esModule", { value: true });
exports.KycService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("axios");
const prisma_service_1 = require("../prisma/prisma.service");
let KycService = class KycService {
    prisma;
    veriffBase = process.env.VERIFF_BASE_URL;
    veriffKey = process.env.VERIFF_API_KEY;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createVeriffSession(userId, documentType, firstName, lastName) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.HttpException('User not found', common_1.HttpStatus.NOT_FOUND);
        const personDetails = {
            firstName,
            lastName,
        };
        try {
            const { data } = await axios_1.default.post(`${this.veriffBase}/v1/sessions`, {
                verification: {
                    person: personDetails,
                    document: { type: documentType },
                    vendorData: userId,
                    callback: `${process.env.BASE_URL}/api/kyc/webhook`,
                },
            }, {
                headers: {
                    'X-AUTH-CLIENT': this.veriffKey,
                    'Content-Type': 'application/json',
                },
            });
            const sessionId = data.verification.id;
            const url = data.verification.url;
            await this.prisma.kyc.create({
                data: {
                    userId,
                    veriffSessionId: sessionId,
                    veriffUrl: url,
                    status: 'PENDING',
                    documentType,
                },
            });
            return { sessionId, url };
        }
        catch (error) {
            console.error(error.response?.data || error);
            throw new common_1.HttpException('Failed to create KYC session', common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async handleWebhook(body) {
        const { id, status, document } = body.verification;
        const kyc = await this.prisma.kyc.findFirst({
            where: { veriffSessionId: id },
        });
        if (!kyc)
            throw new common_1.HttpException('KYC record not found', common_1.HttpStatus.NOT_FOUND);
        let newStatus = 'PENDING';
        if (status === 'approved')
            newStatus = 'APPROVED';
        if (status === 'declined')
            newStatus = 'DECLINED';
        await this.prisma.kyc.update({
            where: { id: kyc.id },
            data: {
                status: newStatus,
                documentType: document?.type,
                webhookData: body,
            },
        });
        if (newStatus === 'APPROVED') {
            await this.prisma.user.update({
                where: { id: kyc.userId },
                data: { kyc: true },
            });
        }
        return { success: true };
    }
    async getKycStatus(userId) {
        return this.prisma.kyc.findFirst({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }
};
exports.KycService = KycService;
exports.KycService = KycService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], KycService);
//# sourceMappingURL=kyc.service.js.map