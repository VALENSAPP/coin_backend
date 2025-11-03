// import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
// import axios from 'axios';
// import { PrismaService } from '../prisma/prisma.service';
// import { KycStatus } from '@prisma/client';


// @Injectable()
// export class KycService {
//   private veriffBase = process.env.VERIFF_BASE_URL;
//   private veriffKey = process.env.VERIFF_API_KEY;

//   constructor(private prisma: PrismaService) {}

//   async createVeriffSession(
//     userId: string,
//     documentType: 'DRIVERS_LICENSE' | 'PASSPORT' | 'ID_CARD',
//   ) {
//     const user = await this.prisma.user.findUnique({ where: { id: userId } });
//     if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

//     // Prepare user details for Veriff
//     // const personDetails: any = {
//     //   firstName: user.userName
//     // };


//     try {
//       const { data } = await axios.post(
//         `${this.veriffBase}/v1/sessions`,
//         {
//           verification: {
//             // person: personDetails,
//             document: { type: documentType },
//             vendorData: userId,
//             callback: `${process.env.BASE_URL}/api/kyc/webhook`,
//           },
//         },
//         {
//           headers: {
//             'X-AUTH-CLIENT': this.veriffKey,
//             'Content-Type': 'application/json',
//           },
//         },
//       );

//       const sessionId = data.verification.id;
//       const url = data.verification.url;

//       await this.prisma.kyc.create({
//         data: {
//           userId,
//           veriffSessionId: sessionId,
//           veriffUrl: url,
//           status: 'PENDING',
//           documentType,
//         },
//       });

//       return { sessionId, url };
//     } catch (error) {
//       console.error(error.response?.data || error);
//       throw new HttpException('Failed to create KYC session', HttpStatus.BAD_REQUEST);
//     }
//   }

//   async handleWebhook(body: any) {
//     const { id, status, document } = body.verification;

//     const kyc = await this.prisma.kyc.findFirst({
//       where: { veriffSessionId: id },
//     });

//     if (!kyc) throw new HttpException('KYC record not found', HttpStatus.NOT_FOUND);

//     let newStatus: 'PENDING' | 'APPROVED' | 'DECLINED' = 'PENDING';
//     if (status === 'approved') newStatus = 'APPROVED';
//     if (status === 'declined') newStatus = 'DECLINED';

//     await this.prisma.kyc.update({
//       where: { id: kyc.id },
//       data: {
//         status: newStatus,
//         documentType: document?.type,
//         webhookData: body,
//       },
//     });

//     if (newStatus === 'APPROVED') {
//       await this.prisma.user.update({
//         where: { id: kyc.userId },
//         data: { kyc: true },
//       });
//     }

//     return { success: true };
//   }

//   async getKycStatus(userId: string) {
//     return this.prisma.kyc.findFirst({
//       where: { userId },
//       orderBy: { createdAt: 'desc' },
//     });
//   }
// }




import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class KycService {
  private veriffBase = process.env.VERIFF_BASE_URL;
  private veriffKey = process.env.VERIFF_API_KEY;

  constructor(private prisma: PrismaService) {}

  /**
   * Create Veriff session for a user with manual first and last name
   */
  async createVeriffSession(
    userId: string,
    documentType: 'DRIVERS_LICENSE' | 'PASSPORT' | 'ID_CARD',
    firstName: string,
    lastName: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

    // Person details passed manually
    const personDetails = {
      firstName,
      lastName,
    };

    try {
      const { data } = await axios.post(
        `${this.veriffBase}/v1/sessions`,
        {
          verification: {
            person: personDetails,
            document: { type: documentType },
            vendorData: userId,
            callback: `${process.env.BASE_URL}/api/kyc/webhook`,
          },
        },
        {
          headers: {
            'X-AUTH-CLIENT': this.veriffKey,
            'Content-Type': 'application/json',
          },
        },
      );

      const sessionId = data.verification.id;
      const url = data.verification.url;

      // Store only session info, no names
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
    } catch (error) {
      console.error(error.response?.data || error);
      throw new HttpException('Failed to create KYC session', HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Handle Veriff webhook
   */
  async handleWebhook(body: any) {
    const { id, status, document } = body.verification;

    const kyc = await this.prisma.kyc.findFirst({
      where: { veriffSessionId: id },
    });

    if (!kyc) throw new HttpException('KYC record not found', HttpStatus.NOT_FOUND);

    let newStatus: 'PENDING' | 'APPROVED' | 'DECLINED' = 'PENDING';
    if (status === 'approved') newStatus = 'APPROVED';
    if (status === 'declined') newStatus = 'DECLINED';

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

  /**
   * Get latest KYC status for a user
   */
  async getKycStatus(userId: string) {
    return this.prisma.kyc.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
