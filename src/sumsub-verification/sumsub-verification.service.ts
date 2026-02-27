// import { BadRequestException, Injectable } from '@nestjs/common';
// import { PrismaService } from '../prisma/prisma.service';
// import axios from 'axios';
// import { createHmac } from 'node:crypto';

// const SUMSUB_LEVEL_NAME = 'basic-kyc-level';
// const SUMSUB_TTL_SEC = 600;

// @Injectable()
// export class SumsubVerificationService {
//   private readonly baseUrl: string;
//   private readonly appToken: string;
//   private readonly secretKey: string;

//   constructor(private readonly prisma: PrismaService) {
//     this.baseUrl = (process.env.SUMSUB_BASE_URL || 'https://api.sumsub.com').replace(/\/$/, '');
//     this.appToken = process.env.SUMSUB_APP_TOKEN || '';
//     this.secretKey = process.env.SUMSUB_SECRET_KEY || '';
//   }

//   private createSignature(ts: number, method: string, path: string, body?: string): string {
//     const data = `${ts}${method}${path}${body || ''}`;
//     return createHmac('sha256', this.secretKey).update(data).digest('hex');
//   }

//   private async sumsubRequest<T>(method: string, path: string, body?: object): Promise<T> {
//     if (!this.appToken || !this.secretKey) {
//       throw new BadRequestException('SumSub is not configured (SUMSUB_APP_TOKEN, SUMSUB_SECRET_KEY).');
//     }
//     const ts = Math.floor(Date.now() / 1000);
//     const bodyStr = body ? JSON.stringify(body) : '';
//     const sig = this.createSignature(ts, method, path, bodyStr);
//     const { data } = await axios.request<T>({
//       method,
//       url: `${this.baseUrl}${path}`,
//       data: body,
//       headers: {
//         'Content-Type': 'application/json',
//         'X-App-Token': this.appToken,
//         'X-App-Access-Ts': String(ts),
//         'X-App-Access-Sig': sig,
//       },
//     });
//     return data;
//   }

//   /** Start company document verification: get SDK access token and store applicantId. */
//   async startVerification(userId: string) {
//     const user = await this.prisma.user.findUnique({
//       where: { id: userId },
//       select: { id: true, profile: true, email: true },
//     });
    
//     if (!user) throw new BadRequestException('User not found');
//     if (user.profile !== 'company') {
//       throw new BadRequestException('Only company profile users can start document verification.');
//     }

//     let companyProfile = await this.prisma.companyProfile.findUnique({
//       where: { userId },
//     });
//     if (!companyProfile) {
//       companyProfile = await this.prisma.companyProfile.create({
//         data: {
//           userId,
//           documentVerificationStatus: 'pending',
//         },
//       });
//     }

//     const externalUserId = userId;
//     const path = '/resources/accessTokens/sdk';
//     const tokenPayload = await this.sumsubRequest<{ token: string; userId: string }>('POST', path, {
//       userId: externalUserId,
//       levelName: SUMSUB_LEVEL_NAME,
//       ttlInSecs: SUMSUB_TTL_SEC,
//       applicantIdentifiers: user.email ? { email: user.email } : undefined,
//     });

//     const applicantPath = `/resources/applicants/byUserId/${encodeURIComponent(externalUserId)}`;
//     let applicantId: string | null = null;
//     try {
//       const applicant = await this.sumsubRequest<{ id: string }>('GET', applicantPath);
//       applicantId = (applicant as any)?.id ?? null;
//     } catch {
//       // Applicant may be created asynchronously; webhook will carry applicantId
//     }

//     if (applicantId) {
//       await this.prisma.companyProfile.update({
//         where: { userId },
//         data: {
//           sumSubApplicantId: applicantId,
//           documentVerificationStatus: 'pending',
//         },
//       });
//     } else {
//       await this.prisma.companyProfile.update({
//         where: { userId },
//         data: { documentVerificationStatus: 'pending' },
//       });
//     }

//     return {
//       token: tokenPayload.token,
//       userId: tokenPayload.userId,
//       applicantId: applicantId ?? undefined,
//     };
//   }

//   /** Get current document verification status for the company user. */
//   async getStatus(userId: string) {
//     const profile = await this.prisma.companyProfile.findUnique({
//       where: { userId },
//       select: {
//         documentVerificationStatus: true,
//         documentVerificationAt: true,
//         documentVerificationRejectReason: true,
//         sumSubApplicantId: true,
//       },
//     });
//     return {
//       documentVerificationStatus: profile?.documentVerificationStatus ?? null,
//       documentVerificationAt: profile?.documentVerificationAt ?? null,
//       documentVerificationRejectReason: profile?.documentVerificationRejectReason ?? null,
//       sumSubApplicantId: profile?.sumSubApplicantId ?? null,
//     };
//   }

//   /** Verify webhook signature (payload = raw string). */
//   verifyWebhookSignature(payload: string, signature: string): boolean {
//     const secret = process.env.SUMSUB_WEBHOOK_SECRET || this.secretKey;
//     const expected = createHmac('sha256', secret).update(payload).digest('hex');
//     return signature === expected || signature === expected.toUpperCase();
//   }

//   /** Handle SumSub webhook: update CompanyProfile when document is approved/rejected. */
//   async handleWebhook(payload: any) {
//     const applicantId = payload?.applicantId ?? payload?.applicant?.id;
//     const externalUserId = payload?.externalUserId ?? payload?.userId;
//     const reviewResult = payload?.reviewResult ?? payload?.applicant?.reviewResult;
//     const reviewAnswer = reviewResult?.reviewAnswer ?? payload?.reviewAnswer;
//     const rejectType = reviewResult?.reviewRejectType ?? payload?.reviewRejectType;

//     let profile = applicantId
//       ? await this.prisma.companyProfile.findFirst({
//           where: { sumSubApplicantId: applicantId },
//         })
//       : null;
//     if (!profile && externalUserId) {
//       profile = await this.prisma.companyProfile.findUnique({
//         where: { userId: externalUserId },
//       });
//     }
//     if (!profile) {
//       console.warn('SumSub webhook: no CompanyProfile for applicantId/externalUserId', { applicantId, externalUserId });
//       return;
//     }

//     const status = reviewAnswer === 'GREEN' ? 'approved' : reviewAnswer === 'RED' ? 'rejected' : null;
//     if (!status) return;

//     await this.prisma.companyProfile.update({
//       where: { id: profile.id },
//       data: {
//         documentVerificationStatus: status,
//         documentVerificationAt: new Date(),
//         documentVerificationRejectReason: status === 'rejected' ? (rejectType || 'Rejected') : null,
//         ...(applicantId && !profile.sumSubApplicantId ? { sumSubApplicantId: applicantId } : {}),
//       },
//     });
//   }
// }

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios, { AxiosRequestConfig } from 'axios';
import { createHmac } from 'crypto';

const SUMSUB_LEVEL_NAME = process.env.SUMSUB_LEVEL_NAME || 'basic-kyc-level';
const SUMSUB_TTL_SEC = 600;

@Injectable()
export class SumsubVerificationService {
  private readonly logger = new Logger(SumsubVerificationService.name);

  private readonly baseUrl: string;
  private readonly appToken: string;
  private readonly secretKey: string;

  constructor(private readonly prisma: PrismaService) {
    this.baseUrl = (process.env.SUMSUB_BASE_URL || 'https://api.sumsub.com').replace(/\/$/, '');
    this.appToken = process.env.SUMSUB_APP_TOKEN || '';
    this.secretKey = process.env.SUMSUB_SECRET_KEY || '';
  }

  /* -------------------------------------------------- */
  /* SIGNATURE */
  /* -------------------------------------------------- */

  private createSignature(ts: number, method: string, path: string, body = ''): string {
    const data = `${ts}${method.toUpperCase()}${path}${body}`;
    return createHmac('sha256', this.secretKey)
      .update(data)
      .digest('hex');
  }

  private async sumsubRequest<T>(
    method: 'GET' | 'POST' | 'PUT',
    path: string,
    body?: object,
  ): Promise<T> {
    if (!this.appToken || !this.secretKey) {
      throw new BadRequestException('Sumsub credentials are missing.');
    }

    const ts = Math.floor(Date.now() / 1000);
    const bodyStr = body ? JSON.stringify(body) : '';
    const signature = this.createSignature(ts, method, path, bodyStr);

    const config: AxiosRequestConfig = {
      method,
      url: `${this.baseUrl}${path}`,
      headers: {
        'Content-Type': 'application/json',
        'X-App-Token': this.appToken,
        'X-App-Access-Ts': ts.toString(),
        'X-App-Access-Sig': signature,
      },
      data: bodyStr || undefined,
    };

    try {
      const response = await axios(config);
      return response.data;
    } catch (error: any) {
      this.logger.error('Sumsub API Error:', error?.response?.data || error.message);
      throw new BadRequestException(
        error?.response?.data?.description || 'Sumsub request failed',
      );
    }
  }

  /* -------------------------------------------------- */
  /* START VERIFICATION */
  /* -------------------------------------------------- */

  async startVerification(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, profile: true },
    });

    if (!user) throw new BadRequestException('User not found');
    if (user.profile !== 'company') {
      throw new BadRequestException('Only company users allowed.');
    }
    const externalUserId = userId;

    // ✅ Correct endpoint
    const tokenResponse = await this.sumsubRequest<{
      token: string;
      userId: string;
    }>('POST', '/resources/accessTokens/sdk', {
      userId: externalUserId,
      levelName: SUMSUB_LEVEL_NAME,
      ttlInSecs: SUMSUB_TTL_SEC,
      applicantIdentifiers: user.email
        ? { email: user.email }
        : undefined,
    });

    // Fetch applicant (optional)
    let applicantId: string | null = null;
    try {
      const applicant = await this.sumsubRequest<any>(
        'GET',
        `/resources/applicants/-;externalUserId=${encodeURIComponent(
          externalUserId,
        )}`,
      );
      applicantId = applicant?.id ?? null;
    } catch {
      this.logger.warn('Applicant not found yet.');
    }

    await this.prisma.companyProfile.upsert({
      where: { userId },
      update: {
        documentVerificationStatus: 'pending',
        sumSubApplicantId: applicantId || undefined,
      },
      create: {
        userId,
        documentVerificationStatus: 'pending',
        sumSubApplicantId: applicantId || undefined,
      },
    });

    return {
      token: tokenResponse.token,
      userId: tokenResponse.userId,
      applicantId,
    };
  }

  /* -------------------------------------------------- */
  /* WEBHOOK SIGNATURE */
  /* -------------------------------------------------- */

  verifyWebhookSignature(payload: string, signature: string): boolean {
    const secret = process.env.SUMSUB_WEBHOOK_SECRET || this.secretKey;
    const hash = createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return hash === signature || hash === signature.toLowerCase();
  }

  /* -------------------------------------------------- */
  /* HANDLE WEBHOOK */
  /* -------------------------------------------------- */

  // async handleWebhook(payload: any) {
  //   const applicantId = payload?.applicantId;
  //   const reviewAnswer = payload?.reviewResult?.reviewAnswer;

  //   if (!applicantId || !reviewAnswer) return;

  //   const profile = await this.prisma.companyProfile.findFirst({
  //     where: { sumSubApplicantId: applicantId },
  //   });

  //   if (!profile) return;

  //   const status =
  //     reviewAnswer === 'GREEN'
  //       ? 'approved'
  //       : reviewAnswer === 'RED'
  //       ? 'rejected'
  //       : null;

  //   if (!status) return;

  //   await this.prisma.companyProfile.update({
  //     where: { id: profile.id },
  //     data: {
  //       documentVerificationStatus: status,
  //       documentVerificationAt: new Date(),
  //     },
  //   });
  // }

  async handleWebhook(payload: any) {
    const applicantId = payload?.applicantId;
    const externalUserId = payload?.externalUserId;
    const reviewAnswer = payload?.reviewResult?.reviewAnswer;
    console.log('[Sumsub Company] handleWebhook:', { applicantId, externalUserId, reviewAnswer });

    if (!applicantId || !reviewAnswer) {
      console.log('[Sumsub Company] Skipped: missing applicantId or reviewAnswer');
      return;
    }

    // 🔥 First try by applicantId
    let profile = await this.prisma.companyProfile.findFirst({
      where: { sumSubApplicantId: applicantId },
    });

    // 🔥 If not found, match by userId (externalUserId)
    if (!profile && externalUserId) {
      profile = await this.prisma.companyProfile.findUnique({
        where: { userId: externalUserId },
      });
    }

    if (!profile) {
      console.warn('[Sumsub Company] No CompanyProfile found for applicantId/externalUserId', { applicantId, externalUserId });
      return;
    }

    const status =
      reviewAnswer === 'GREEN'
        ? 'approved'
        : reviewAnswer === 'RED'
        ? 'rejected'
        : null;

    if (!status) return;

    await this.prisma.companyProfile.update({
      where: { id: profile.id },
      data: {
        sumSubApplicantId: applicantId, // 🔥 VERY IMPORTANT
        documentVerificationStatus: status,
        documentVerificationAt: new Date(),
      },
    });
    console.log('[Sumsub Company] DB updated: profileId=', profile.id, 'userId=', profile.userId, 'status=', status);
  }

  async getStatus(userId: string) {
    const profile = await this.prisma.companyProfile.findUnique({
      where: { userId },
      select: {
        documentVerificationStatus: true,
        documentVerificationAt: true,
        documentVerificationRejectReason: true,
        sumSubApplicantId: true,
      },
    });
    return {
      documentVerificationStatus: profile?.documentVerificationStatus ?? null,
      documentVerificationAt: profile?.documentVerificationAt ?? null,
      documentVerificationRejectReason: profile?.documentVerificationRejectReason ?? null,
      sumSubApplicantId: profile?.sumSubApplicantId ?? null,
    };
  }
}
