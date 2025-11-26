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
const node_crypto_1 = require("node:crypto");
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
                    callback: `${process.env.BASE_URL}/veriff.html`,
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
    async handleWebhook(verification) {
        const { id, action, code } = verification;
        console.log(`🔍 Processing webhook for session ${id} with action: ${action}, code: ${code}`);
        const kycRecord = await this.prisma.kyc.findFirst({
            where: {
                veriffSessionId: id,
                status: { in: ['PENDING', 'SUBMITTED'] }
            },
        });
        if (!kycRecord) {
            console.log(`ℹ️ Skipping webhook for session ${id} - not found or already processed`);
            return;
        }
        let mappedStatus = 'PENDING';
        if (action === 'approved' || code === 7003)
            mappedStatus = 'APPROVED';
        else if (action === 'declined' || code === 7004 || action === 'decision')
            mappedStatus = 'DECLINED';
        else if (action === 'submitted' || code === 7002)
            mappedStatus = 'SUBMITTED';
        else if (action === 'started' || code === 7001)
            mappedStatus = 'PENDING';
        else if (action === 'expired' || action === 'abandoned' || action === 'reviewed')
            mappedStatus = 'DECLINED';
        console.log(`🔄 Mapping action '${action}' (code: ${code}) to '${mappedStatus}'`);
        await this.prisma.kyc.update({
            where: { id: kycRecord.id },
            data: { status: mappedStatus, webhookData: verification },
        });
        if (mappedStatus === 'APPROVED') {
            await this.prisma.user.update({
                where: { id: kycRecord.userId },
                data: { kyc: true },
            });
            console.log(`✅ User KYC status updated to true for user ${kycRecord.userId}`);
        }
        console.log(`✅ KYC record updated: ${id} → ${mappedStatus}`);
    }
    async getKycStatus(userId) {
        return this.prisma.kyc.findFirst({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async fetchVeriffStatus(sessionId) {
        try {
            const signature = (0, node_crypto_1.createHmac)('sha256', process.env.VERIFF_SECRET_KEY || '')
                .update(sessionId)
                .digest('hex')
                .toLowerCase();
            const headers = {
                'X-AUTH-CLIENT': this.veriffKey,
                'X-HMAC-SIGNATURE': signature,
                'Content-Type': 'application/json',
            };
            let response;
            try {
                response = await axios_1.default.get(`${this.veriffBase}/v1/sessions/${sessionId}`, { headers });
            }
            catch (err) {
                console.warn('Full session fetch failed, falling back to attempts endpoint...');
                response = await axios_1.default.get(`${this.veriffBase}/v1/sessions/${sessionId}/attempts`, { headers });
            }
            const verificationData = response.data?.verification || response.data?.verifications?.[0];
            if (!verificationData) {
                console.error('No verification data found in response');
                return null;
            }
            const veriffStatus = verificationData.status;
            console.log(`🔍 Fetched Veriff status for ${sessionId}: ${veriffStatus}`);
            let reason = null;
            if (veriffStatus === 'declined') {
                try {
                    const decisionResponse = await axios_1.default.get(`${this.veriffBase}/v1/sessions/${sessionId}/decision`, { headers });
                    const decisionData = decisionResponse.data;
                    reason = decisionData?.verification?.decision?.reason || decisionData?.reason || 'Unknown reason';
                    console.log(`📋 Fetched decline reason for ${sessionId}: ${reason}`);
                }
                catch (decisionError) {
                    console.warn(`Could not fetch decision for declined session ${sessionId}:`, decisionError.message);
                    reason = 'Reason not available';
                }
            }
            return { status: veriffStatus, reason };
        }
        catch (error) {
            console.error('❌ Failed to fetch Veriff status:', error.response?.data || error);
            return null;
        }
    }
    async syncKycStatus(userId) {
        const kycRecord = await this.prisma.kyc.findFirst({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
        if (!kycRecord) {
            throw new common_1.HttpException('KYC record not found', common_1.HttpStatus.NOT_FOUND);
        }
        const veriffData = await this.fetchVeriffStatus(kycRecord.veriffSessionId);
        if (!veriffData) {
            return { success: false, message: 'Could not fetch status from Veriff' };
        }
        const veriffStatus = veriffData.status;
        const reason = veriffData.reason;
        let mappedStatus = kycRecord.status;
        if (veriffStatus === 'approved')
            mappedStatus = 'APPROVED';
        else if (veriffStatus === 'declined')
            mappedStatus = 'DECLINED';
        else if (veriffStatus === 'submitted')
            mappedStatus = 'SUBMITTED';
        else if (veriffStatus === 'expired')
            mappedStatus = 'DECLINED';
        if (mappedStatus !== kycRecord.status) {
            await this.prisma.kyc.update({
                where: { id: kycRecord.id },
                data: { status: mappedStatus },
            });
            if (mappedStatus === 'APPROVED') {
                await this.prisma.user.update({
                    where: { id: userId },
                    data: { kyc: true },
                });
            }
            console.log(`✅ Synced KYC status: ${kycRecord.veriffSessionId} → ${mappedStatus}`);
            return { success: true, status: mappedStatus, updated: true, reason: mappedStatus === 'DECLINED' ? reason : null };
        }
        return { success: true, status: mappedStatus, updated: false, reason: mappedStatus === 'DECLINED' ? reason : null };
    }
    async syncAllPendingKyc() {
        const pendingRecords = await this.prisma.kyc.findMany({
            where: {
                status: { in: ['PENDING', 'SUBMITTED'] }
            }
        });
        console.log(`📋 Found ${pendingRecords.length} pending/submitted KYC records to sync`);
        let updated = 0;
        let errors = 0;
        for (const record of pendingRecords) {
            try {
                const veriffData = await this.fetchVeriffStatus(record.veriffSessionId);
                if (!veriffData) {
                    console.log(`⚠️ Could not fetch status for session ${record.veriffSessionId}`);
                    errors++;
                    continue;
                }
                const veriffStatus = veriffData.status;
                let mappedStatus = record.status;
                if (veriffStatus === 'approved')
                    mappedStatus = 'APPROVED';
                else if (veriffStatus === 'declined')
                    mappedStatus = 'DECLINED';
                else if (veriffStatus === 'submitted')
                    mappedStatus = 'SUBMITTED';
                else if (veriffStatus === 'expired')
                    mappedStatus = 'DECLINED';
                if (mappedStatus !== record.status) {
                    await this.prisma.kyc.update({
                        where: { id: record.id },
                        data: { status: mappedStatus },
                    });
                    if (mappedStatus === 'APPROVED') {
                        await this.prisma.user.update({
                            where: { id: record.userId },
                            data: { kyc: true },
                        });
                    }
                    console.log(`✅ Updated KYC ${record.veriffSessionId}: ${record.status} → ${mappedStatus}`);
                    updated++;
                }
                else {
                    console.log(`ℹ️ KYC ${record.veriffSessionId} status unchanged: ${mappedStatus}`);
                }
            }
            catch (error) {
                console.error(`❌ Error syncing KYC ${record.veriffSessionId}:`, error);
                errors++;
            }
        }
        console.log(`🎯 Sync completed: ${updated} updated, ${errors} errors, ${pendingRecords.length - updated - errors} unchanged`);
        return {
            success: true,
            total: pendingRecords.length,
            updated,
            errors,
            unchanged: pendingRecords.length - updated - errors
        };
    }
};
exports.KycService = KycService;
exports.KycService = KycService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], KycService);
//# sourceMappingURL=kyc.service.js.map