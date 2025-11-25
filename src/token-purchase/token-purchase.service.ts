import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PurchaseTokensDto, TokenPurchaseResponseDto, BuyTokenDto, SellTokenDto } from './dto/purchase-tokens.dto';
import { TokenService } from '../token/token.service';
import { UserService } from '../user/user.service';
import Stripe from 'stripe';
import { ethers } from 'ethers';
import { decryptSecret } from '../common/crypto.util';

@Injectable()
export class TokenPurchaseService {
  private readonly logger = new Logger(TokenPurchaseService.name);
  private stripe: Stripe;

  private readonly TOKEN_RATE = 100; // 1 USD = 100 tokens

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly userService: UserService
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      apiVersion: '2024-06-20',
    });
  }

  async getTotalTokenData(userId: string) {
    try {
      // Get all completed token purchases where action is 'buy'
      const tokenPurchases = await this.prisma.tokenPurchase.findMany({
        where: {
          userId,
          status: 'completed',
          action: 'buy',
        },
        select: {
          vendorId: true,
          tokensReceived: true,
        },
      });

      if (!tokenPurchases || tokenPurchases.length === 0) {
        return [];
      }

      // Group purchases by vendorId and sum tokensReceived
      const vendorTokenMap = new Map<string, number>();

      for (const purchase of tokenPurchases) {
        if (purchase.vendorId) {
          const currentAmount = vendorTokenMap.get(purchase.vendorId) || 0;
          vendorTokenMap.set(purchase.vendorId, currentAmount + purchase.tokensReceived);
        }
      }

      // Get token details for each vendor
      const result = [];

      for (const [vendorId, tokenAmount] of vendorTokenMap.entries()) {
        // Find tokenAddress from UserToken table for the vendor
        const userToken = await this.prisma.userToken.findFirst({
          where: { userId: vendorId },
          select: { tokenAddress: true },
        });

        if (!userToken || !userToken.tokenAddress) {
          this.logger.warn(`Token address not found for vendor ${vendorId}`);
          continue;
        }

        // Get vendor name from User table
        const vendor = await this.prisma.user.findUnique({
          where: { id: vendorId },
          select: { userName: true },
        });

        const vendorName = vendor?.userName || 'Unknown Vendor';
        const tokenAddress = userToken.tokenAddress;

        // Get token price from contract using tokenService
        const priceData = await this.tokenService.getPricePerTokenUsd(tokenAddress);
        const tokenPrice = priceData.priceInUsd;

        // Calculate total token amount
        const totalTokenAmount = tokenPrice * tokenAmount;

        result.push({
          tokenAddress,
          tokenAmount,
          tokenPrice,
          totalTokenAmount,
          vendorName,
          vendorId,
        });
      }

      return result;
    } catch (error) {
      this.logger.error('Error getting total token data:', error);
      throw error;
    }
  }

  /**
   * Validate fee parameters provided by frontend
   */
  private validateFees(dto: PurchaseTokensDto) {
    const expectedRestAmount = dto.amount - (dto.platformFee + dto.vendorFee);
    const expectedTokensReceived = expectedRestAmount * this.TOKEN_RATE;

    if (Math.abs(dto.restAmount - expectedRestAmount) > 0.01) {
      throw new BadRequestException('Invalid restAmount: does not match amount - (platformFee + vendorFee)');
    }

    if (Math.abs(dto.tokensReceived - expectedTokensReceived) > 0.01) {
      throw new BadRequestException('Invalid tokensReceived: does not match restAmount * token rate');
    }
  }

  /**
   * Create a token purchase session
   */
  async createTokenPurchase(userId: string, dto: PurchaseTokensDto): Promise<TokenPurchaseResponseDto> {
    try {
      // Validate user exists
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true },
      });

      if (!user) {
        throw new BadRequestException('User not found');
      }

      // Validate vendor if provided
      if (dto.vendorId) {
        const vendor = await this.prisma.user.findUnique({
          where: { id: dto.vendorId },
          select: { id: true },
        });
        if (!vendor) {
          throw new BadRequestException('Vendor not found');
        }
      }

      // Validate fees provided by frontend
      // this.validateFees(dto);

      this.logger.log(`Creating token purchase for user ${userId}: $${dto.amount} -> ${dto.tokensReceived} tokens`);

      // Get success and cancel URLs from environment
      const successUrl = process.env.STRIPE_SUCCESS_URL as string;
      const cancelUrl = process.env.STRIPE_CANCEL_URL as string;

      // Create Stripe Checkout Session
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Token Purchase',
                description: `Purchase ${dto.tokensReceived} tokens`,
              },
              unit_amount: Math.round(dto.amount * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          userId,
          vendorId: dto.vendorId || '',
          type: 'token_purchase',
        },
        customer_email: user.email || undefined,
      });

      // Create token purchase record
      const tokenPurchaseData: any = {
        userId,
        vendorId: dto.vendorId,
        amount: dto.amount,
        platformFee: dto.platformFee,
        vendorFee: dto.vendorFee,
        restAmount: dto.restAmount,
        tokensReceived: dto.tokensReceived,
        stripeCheckoutSessionId: session.id,
        status: 'pending',
      };

      // Only include purchaseTokenPrice if it's provided and the database supports it
      if (dto.purchaseTokenPrice !== undefined) {
        tokenPurchaseData.purchaseTokenPrice = dto.purchaseTokenPrice;
      }

      const tokenPurchase = await this.prisma.tokenPurchase.create({
        data: tokenPurchaseData,
      });

      const response: any = {
        id: tokenPurchase.id,
        amount: dto.amount,
        platformFee: dto.platformFee,
        vendorFee: dto.vendorFee,
        restAmount: dto.restAmount,
        tokensReceived: dto.tokensReceived,
        status: tokenPurchase.status,
        sessionUrl: session.url!,
      };

      // Only include purchaseTokenPrice in response if it was provided
      if (dto.purchaseTokenPrice !== undefined) {
        response.purchaseTokenPrice = dto.purchaseTokenPrice;
      }

      return response;

    } catch (error) {
      this.logger.error('Error creating token purchase:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create token purchase');
    }
  }

  /**
   * Handle successful payment webhook
   */
  async handlePaymentSuccess(paymentIntentId: string) {
    try {
      // Find the token purchase
      const tokenPurchase = await this.prisma.tokenPurchase.findFirst({
        where: { stripePaymentIntentId: paymentIntentId },
      });

      if (!tokenPurchase) {
        this.logger.warn(`Token purchase not found for payment intent: ${paymentIntentId}`);
        return;
      }

      if (tokenPurchase.status === 'completed') {
        this.logger.log(`Token purchase already completed: ${tokenPurchase.id}`);
        return;
      }

      // Update token purchase status
      await this.prisma.tokenPurchase.update({
        where: { id: tokenPurchase.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      });

      this.logger.log(`Token purchase completed: ${tokenPurchase.id} - ${tokenPurchase.tokensReceived} tokens purchased for user ${tokenPurchase.userId}`);

    } catch (error) {
      this.logger.error('Error handling payment success:', error);
      throw error;
    }
  }

  /**
   * Handle successful checkout session webhook
   */
  async handleCheckoutSessionCompleted(sessionId: string) {
    try {
      // Find the token purchase
      const tokenPurchase = await this.prisma.tokenPurchase.findFirst({
        where: { stripeCheckoutSessionId: sessionId } as any,
      });

      if (!tokenPurchase) {
        this.logger.warn(`Token purchase not found for checkout session: ${sessionId}`);
        return;
      }

      this.logger.log(`Token purchase found: ${JSON.stringify({
        id: tokenPurchase.id,
        userId: tokenPurchase.userId,
        vendorId: tokenPurchase.vendorId,
        amount: tokenPurchase.amount,
        status: tokenPurchase.status
      })}`);

      if (tokenPurchase.status === 'completed') {
        this.logger.log(`Token purchase already completed: ${tokenPurchase.id}`);
        return;
      }

      // Update token purchase status
      await this.prisma.tokenPurchase.update({
        where: { id: tokenPurchase.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      });

      // Get user details
      const user = await this.prisma.user.findUnique({
        where: { id: tokenPurchase.userId },
        select: { id: true, walletAddress: true },
      });

      if (!user || !user.walletAddress) {
        this.logger.error(`User ${tokenPurchase.userId} not found or no wallet address`);
        return;
      }

      // Get coin address
      let coinAddress: string | null = null;
      if (tokenPurchase.vendorId) {
        const vendorToken = await this.prisma.userToken.findFirst({
          where: { userId: tokenPurchase.vendorId },
          select: { tokenAddress: true },
        });
        if (vendorToken && vendorToken.tokenAddress) {
          coinAddress = vendorToken.tokenAddress;
        }
      }


      if (!coinAddress) {
        this.logger.error('No coin address available for purchase');
        return;
      }

      if (!tokenPurchase.vendorId) {
        this.logger.warn('No vendorId for token purchase, skipping buyToken');
        return;
      }

      // Call buyToken to handle the blockchain purchase
      const buyResult = await this.buyToken(tokenPurchase.userId, {
        userId: tokenPurchase.vendorId!,
        userPaid: tokenPurchase.tokensReceived
      });
      this.logger.log(`BuyToken completed: ${buyResult.transactionHash} for user ${tokenPurchase.userId}`);

      // Follow the token owner if vendorId exists
      this.logger.log(`Checking follow logic - vendorId: ${tokenPurchase.vendorId}, userId: ${tokenPurchase.userId}`);
      if (tokenPurchase.vendorId && tokenPurchase.vendorId.trim() !== '') {
        this.logger.log(`Attempting to follow token owner ${tokenPurchase.vendorId} by user ${tokenPurchase.userId}`);
        try {
          await this.userService.followPerson(tokenPurchase.userId, tokenPurchase.vendorId);
          this.logger.log(`SUCCESS: User ${tokenPurchase.userId} followed token owner ${tokenPurchase.vendorId}`);
        } catch (followError) {
          // Check if it's just "already following" error, which is not a real failure
          if (followError.message && followError.message.includes('Already following')) {
            this.logger.log(`INFO: User ${tokenPurchase.userId} already follows token owner ${tokenPurchase.vendorId}`);
          } else {
            this.logger.error(`FAILED: Follow attempt failed: ${followError.message}`, followError.stack);
          }
        }
      } else {
        this.logger.log(`SKIP: No valid vendorId found (null or empty), skipping follow`);
      }

      this.logger.log(`Token purchase completed: ${tokenPurchase.id} - ${tokenPurchase.tokensReceived} tokens purchased for user ${tokenPurchase.userId}`);

    } catch (error) {
      this.logger.error('Error handling checkout session success:', error);
      throw error;
    }
  }

  /**
   * Handle checkout session expired webhook
   */
  async handleCheckoutSessionExpired(sessionId: string) {
    try {
      // Find the token purchase
      const tokenPurchase = await this.prisma.tokenPurchase.findFirst({
        where: { stripeCheckoutSessionId: sessionId } as any,
      });

      if (!tokenPurchase) {
        this.logger.warn(`Token purchase not found for checkout session: ${sessionId}`);
        return;
      }

      // Update status to expired
      await this.prisma.tokenPurchase.update({
        where: { id: tokenPurchase.id },
        data: {
          status: 'expired',
        },
      });

      this.logger.log(`Token purchase expired: ${tokenPurchase.id}`);

    } catch (error) {
      this.logger.error('Error handling checkout session expiration:', error);
      throw error;
    }
  }

  /**
   * Handle failed payment webhook
   */
  async handlePaymentFailed(paymentIntentId: string) {
    try {
      // Find the token purchase
      const tokenPurchase = await this.prisma.tokenPurchase.findFirst({
        where: { stripePaymentIntentId: paymentIntentId },
      });

      if (!tokenPurchase) {
        this.logger.warn(`Token purchase not found for payment intent: ${paymentIntentId}`);
        return;
      }

      // Update status to failed
      await this.prisma.tokenPurchase.update({
        where: { id: tokenPurchase.id },
        data: {
          status: 'failed',
        },
      });

      this.logger.log(`Token purchase failed: ${tokenPurchase.id}`);

    } catch (error) {
      this.logger.error('Error handling payment failure:', error);
      throw error;
    }
  }

  /**
   * Get user's token balance
   */
  async getUserTokenBalance(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tokenBalance: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return user.tokenBalance;
  }

  /**
   * Get total tokens purchased by user from a specific vendor
   */
  async getVendorTokenAmount(userId: string, vendorId: string): Promise<number> {
    try {
      const tokenPurchaseSum = await this.prisma.tokenPurchase.aggregate({
        _sum: {
          tokensReceived: true,
        },
        where: {
          userId,
          vendorId,
          status: 'completed',
        },
      });

      return tokenPurchaseSum._sum.tokensReceived || 0;
    } catch (error) {
      this.logger.error('Error getting vendor token amount:', error);
      throw new BadRequestException('Failed to get vendor token amount');
    }
  }

  /**
   * Get user's token purchase history
   */
  async getUserTokenPurchases(userId: string) {
    return this.prisma.tokenPurchase.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amount: true,
        platformFee: true,
        vendorFee: true,
        restAmount: true,
        tokensReceived: true,
        status: true,
        createdAt: true,
        completedAt: true,
      },
    });
  }

  /**
   * Get user's token transaction history (purchases and sales) with running balance
   */
  async getUserTokenHistory(userId: string, tokenAddress?: string, period?: 'week' | 'month' | 'year') {
    try {
      // Validate tokenAddress if provided
      if (tokenAddress) {
        const tokenExists = await this.prisma.userToken.findFirst({
          where: { tokenAddress },
          select: { userId: true },
        });
        if (!tokenExists) {
          throw new BadRequestException('Invalid token address: token not found');
        }
      }

      // Calculate date filter based on period
      let dateFilter: Date | null = null;
      if (period) {
        const now = new Date();
        switch (period) {
          case 'week':
            dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case 'year':
            dateFilter = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
        }
      }

      // Get all purchases for this user (optionally filtered by token and date)
      console.log("?????????????????????????????????????????????????????????????????",userId, tokenAddress, period);
      let purchaseWhere: any = {
        userId,
        status: 'completed',
      };

      if (tokenAddress) {
        // Find vendor ID for the token address
        const userToken = await this.prisma.userToken.findFirst({
          where: { tokenAddress },
          select: { userId: true },
        });
        if (userToken) {
          purchaseWhere.vendorId = userToken.userId;
        }
      }

      // Add date filter for purchases
      if (dateFilter) {
        purchaseWhere.completedAt = {
          gte: dateFilter,
        };
      }

      const purchases = await this.prisma.tokenPurchase.findMany({
        where: purchaseWhere,
        orderBy: { completedAt: 'asc' },
        select: {
          id: true,
          vendorId: true,
          tokensReceived: true,
          completedAt: true,
        },
      });

      // Get token details for purchases
      const purchaseWithTokenDetails = await Promise.all(
        purchases.map(async (purchase) => {
          if (!purchase.vendorId) {
            return {
              ...purchase,
              userToken: null,
            };
          }
          const userToken = await this.prisma.userToken.findFirst({
            where: { userId: purchase.vendorId },
            select: {
              tokenAddress: true,
              tokenName: true,
            },
          });
          return {
            ...purchase,
            userToken,
          };
        })
      );

      // Get all sales for this user (optionally filtered by token and date)
      let saleWhere: any = {
        userId,
        status: 'completed',
      };

      if (tokenAddress) {
        saleWhere.tokenAddress = tokenAddress;
      }

      // Add date filter for sales
      if (dateFilter) {
        saleWhere.createdAt = {
          gte: dateFilter,
        };
      }

    console.log("?????????????????????????????????????????????????????????????????",saleWhere);
      const sales = await this.prisma.tokenSale.findMany({
        where: saleWhere,
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          tokenAddress: true,
          vendorId: true,
          sellAmount: true,
          transactionHash: true,
          createdAt: true,
        },
      });

      // Get token details for sales
      const salesWithTokenDetails = await Promise.all(
        sales.map(async (sale) => {
          const userToken = await this.prisma.userToken.findFirst({
            where: { tokenAddress: sale.tokenAddress },
            select: {
              tokenName: true,
            },
          });
          return {
            ...sale,
            userToken,
          };
        })
      );

      // Combine and sort all transactions by date
      const allTransactions: any[] = [];

      // Add purchases
      purchaseWithTokenDetails.forEach(purchase => {
        if (purchase.completedAt) {
          allTransactions.push({
            id: purchase.id,
            type: 'purchase',
            tokenAddress: purchase.userToken?.tokenAddress || '',
            tokenName: purchase.userToken?.tokenName || '',
            vendorId: purchase.vendorId,
            amount: purchase.tokensReceived,
            date: purchase.completedAt,
            transactionHash: null,
          });
        }
      });

      // Add sales
      salesWithTokenDetails.forEach((sale: any) => {
        allTransactions.push({
          id: sale.id,
          type: 'sale',
          tokenAddress: sale.tokenAddress,
          tokenName: sale.userToken?.tokenName || '',
          vendorId: sale.vendorId,
          amount: -sale.sellAmount, // Negative for sales
          date: sale.createdAt,
          transactionHash: sale.transactionHash,
        });
      });

      // Sort by date
      allTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Calculate running balance
      let runningBalance = 0;
      const historyWithBalance = allTransactions.map(transaction => {
        runningBalance += transaction.amount;
        return {
          ...transaction,
          balanceAfter: runningBalance,
        };
      });

      return {
        tokenAddress: tokenAddress || null,
        period: period || null,
        totalTransactions: historyWithBalance.length,
        currentBalance: runningBalance,
        history: historyWithBalance.reverse(), // Most recent first
      };

    } catch (error) {
      this.logger.error('Error getting token history:', error);
      throw new BadRequestException('Failed to get token history');
    }
  }

  /**
   * Buy tokens using blockchain smart contract
   */
  async buyToken(buyerUserId: string, dto: BuyTokenDto) {
    try {
      // Get buyer user details
      const buyer = await this.prisma.user.findUnique({
        where: { id: buyerUserId },
        select: { id: true, walletAddress: true },
      });

      if (!buyer) {
        throw new BadRequestException('Buyer not found');
      }

      if (!buyer.walletAddress) {
        throw new BadRequestException('Buyer wallet address not found');
      }

      // Get token address from userToken table
      const userToken = await this.prisma.userToken.findFirst({
        where: { userId: dto.userId },
        select: { tokenAddress: true, tokenName: true },
      });

      if (!userToken || !userToken.tokenAddress) {
        throw new BadRequestException('Token not found for this user');
      }

      this.logger.log(`Buying token for user ${dto.userId}: ${userToken.tokenName} (${userToken.tokenAddress})`);

      // Log the input value for debugging
      this.logger.log(`dto.userPaid (token amount): ${dto.userPaid}`);

      // Convert token amount to wei (assuming tokens have 18 decimals)
      const tokenAmountInWei = ethers.parseEther(dto.userPaid.toString());

      this.logger.log(`Converted token amount to wei: ${tokenAmountInWei.toString()}`);

      // Call the buyFor method on the smart contract
      const contract = this.tokenService.getContract();

      if (!contract) {
        throw new BadRequestException('Smart contract not initialized');
      }

      const tx = await contract.buyFor(
        userToken.tokenAddress,
        buyer.walletAddress,
        tokenAmountInWei
      );

      this.logger.log(`Transaction sent: ${tx.hash}`);

      // Wait for transaction confirmation
      const receipt = await tx.wait();

      this.logger.log(`Transaction confirmed in block: ${receipt.blockNumber}`);

      return {
        success: true,
        transactionHash: tx.hash,
        tokenAddress: userToken.tokenAddress,
        buyerAddress: buyer.walletAddress,
        tokenAmount: dto.userPaid,
        blockNumber: receipt.blockNumber,
      };

    } catch (error) {
      this.logger.error('Error buying token:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to buy token: ${error.message}`);
    }
  }

  /**
   * Get top creators based on latest token purchases
   */
  async getTopCreators() {
    try {
      // Get all token purchases with vendorId, ordered by createdAt desc
      const purchases = await this.prisma.tokenPurchase.findMany({
        where: {
          vendorId: { not: null },
          purchaseTokenPrice: { not: null }
        },
        orderBy: { createdAt: 'desc' },
        select: {
          vendorId: true,
          purchaseTokenPrice: true,
          createdAt: true
        },
      });

      // Group by vendorId, take the latest entry
      const latestByVendor = new Map<string, { purchaseTokenPrice: number; createdAt: Date }>();

      for (const purchase of purchases) {
        if (purchase.vendorId && !latestByVendor.has(purchase.vendorId)) {
          latestByVendor.set(purchase.vendorId, {
            purchaseTokenPrice: purchase.purchaseTokenPrice!,
            createdAt: purchase.createdAt
          });
        }
      }

      // Get usernames, follower count, and token status
      const result = [];
      for (const [vendorId, data] of latestByVendor) {
        const user = await this.prisma.user.findUnique({
          where: { id: vendorId },
          select: { userName: true, displayName: true, id: true },
        });

        if (user) {
          // Get follower count
          const followerCount = await this.prisma.followerAndFollowing.count({
            where: {
              followingId: vendorId,
              status: 'ACCEPTED'
            }
          });

          // Calculate token status (up/low) based on price growth
          let currentTokenStatus = 'low'; // default

          // Get user's token address and initial price
          const userToken = await this.prisma.userToken.findFirst({
            where: { userId: vendorId },
            select: { tokenAddress: true, initialPrice: true }
          });

          if (userToken?.tokenAddress) {
            try {
              // Get current price
              const currentPriceData = await this.tokenService.getPricePerTokenUsd(userToken.tokenAddress);
              const currentPrice = currentPriceData.priceInUsd;

              // Get initial price from userToken
              const initialPrice = parseFloat(userToken.initialPrice || '0');

              if (initialPrice > 0) {
                const growthPercentage = ((currentPrice - initialPrice) / initialPrice) * 100;
                currentTokenStatus = growthPercentage > 0 ? 'up' : 'low';
              }
            } catch (error) {
              this.logger.warn(`Failed to calculate token status for user ${vendorId}:`, error);
              // Keep default 'low' status
            }
          }

          result.push({
            username: user.userName || user.displayName || 'Unknown',
            vendorId,
            followerCount,
            currentTokenStatus,
          });
        }
      }

      // Sort by follower count descending to show top creators
      result.sort((a, b) => b.followerCount - a.followerCount);

      return result;
    } catch (error) {
      this.logger.error('Error getting top creators:', error);
      throw new BadRequestException('Failed to get top creators');
    }
  }

  /**
   * Sell tokens using blockchain smart contract with permit
   */
  async sellToken(sellerUserId: string, dto: SellTokenDto) {
    try {
      // Get seller user details including encrypted private key
      const seller = await this.prisma.user.findUnique({
        where: { id: sellerUserId },
        select: { id: true, walletAddress: true, walletPrivateKey: true },
      });

      if (!seller) {
        throw new BadRequestException('Seller not found');
      }

      if (!seller.walletAddress) {
        throw new BadRequestException('Seller wallet address not found');
      }

      if (!seller.walletPrivateKey) {
        throw new BadRequestException('Seller wallet private key not found');
      }

      // Get vendor (token owner) from userToken table
      const userToken = await this.prisma.userToken.findFirst({
        where: { tokenAddress: dto.tokenAddress },
        select: { userId: true, tokenName: true },
      });

      if (!userToken) {
        throw new BadRequestException('Token not found');
      }

      const vendorId = userToken.userId;

      this.logger.log(`Selling token for user ${sellerUserId}: ${userToken.tokenName} (${dto.tokenAddress})`);

      // Calculate user's token balance for this specific token
      const tokenPurchases = await this.prisma.tokenPurchase.findMany({
        where: {
          userId: sellerUserId,
          vendorId: vendorId,
          status: 'completed',
        },
        select: { tokensReceived: true },
      });

      const totalTokensOwned = tokenPurchases.reduce((sum, purchase) => sum + purchase.tokensReceived, 0);

      this.logger.log(`User ${sellerUserId} owns ${totalTokensOwned} tokens of ${dto.tokenAddress}`);

      // Check if user has enough tokens to sell
      const checkAmount = Number(dto.amountTokens);

      console.log("pppppppppddddpppppppppppp", checkAmount, totalTokensOwned);

      if (checkAmount > totalTokensOwned) {
        throw new BadRequestException(`Insufficient token balance. Owned: ${totalTokensOwned}, Trying to sell: ${checkAmount}`);
      }

      // Validate that amountTokens is a valid number and can be converted to BigInt
      if (isNaN(checkAmount) || !isFinite(checkAmount) || checkAmount <= 0 || !Number.isInteger(checkAmount)) {
        throw new BadRequestException('Invalid amountTokens: must be a positive integer');
      }

      const amountToSell = BigInt(Math.round(Number(dto.amountTokens) * 1e18));
    //   let tokenAmount;
    //  tokenAmount= amountToSell * 1e18; // This is the amount in float
      // Generate permit signature
      const encryptionKey = process.env.WALLET_ENCRYPTION_KEY as string;
      const privateKey = decryptSecret(seller.walletPrivateKey, encryptionKey);

      const spender = process.env.BSC_CONTRACT_ADDRESS as string;
      if (!spender) {
        throw new BadRequestException('Contract address not configured');
      }

      // Create permit signature
      const provider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL || "https://data-seed-prebsc-1-s1.binance.org:8545");
      const wallet = new ethers.Wallet(privateKey, provider);

      const tokenAbi = [
        "function name() view returns (string)",
        "function nonces(address) view returns (uint256)",
        "function DOMAIN_SEPARATOR() view returns (bytes32)"
      ];

      const tokenContract = new ethers.Contract(dto.tokenAddress, tokenAbi, provider);

      const name = await tokenContract.name();
      const version = "1";
      const chainId = (await provider.getNetwork()).chainId;
      const nonce = await tokenContract.nonces(wallet.address);

      const domain = {
        name,
        version,
        chainId,
        verifyingContract: dto.tokenAddress,
      };

      const types = {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      };

      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

      const message = {
        owner: wallet.address,
        spender,
        value: amountToSell, // Use the amount being sold as BigInt
        nonce,
        deadline,
      };

      
      this.logger.log(`Generating permit signature for token sale: ${JSON.stringify(message, (key, value) => typeof value === 'bigint' ? value.toString() : value)}`);


      const signature = await wallet.signTypedData(domain, types, message);
      const sig = ethers.Signature.from(signature);
      const { v, r, s } = sig;

      // Call sellWithPermit on the smart contract
      const contract = this.tokenService.getContract();

      if (!contract) {
        throw new BadRequestException('Smart contract not initialized');
      }

      const tx = await contract.sellWithPermit(
        dto.tokenAddress,
        seller.walletAddress,
        amountToSell,
        deadline,
        v,
        r,
        s
      );

      this.logger.log(`SellWithPermit transaction sent: ${tx.hash}`);

      // Wait for transaction confirmation
      const receipt = await tx.wait();

      this.logger.log(`SellWithPermit transaction confirmed in block: ${receipt.blockNumber}`);

      // Record the token sale in database
      const tokenSale = await this.prisma.tokenSale.create({
        data: {
          userId: sellerUserId,
          tokenAddress: dto.tokenAddress,
          vendorId: vendorId,
          amountTokens: dto.amountTokens,
          sellAmount: checkAmount,
          transactionHash: tx.hash,
          status: 'completed',
        },
      });

      this.logger.log(`Token sale completed for user ${sellerUserId} (database recording temporarily disabled)`);

      // Check if user is selling all tokens
      const remainingTokens = totalTokensOwned - checkAmount;
      if (remainingTokens <= 0.000001) { // Allow for small floating point differences
        this.logger.log(`User ${sellerUserId} sold all tokens of ${dto.tokenAddress}, unfollowing vendor ${vendorId}`);
        try {
          await this.userService.unfollow(sellerUserId, vendorId);
          this.logger.log(`SUCCESS: User ${sellerUserId} unfollowed vendor ${vendorId}`);
        } catch (unfollowError) {
          // Log but don't fail the transaction if unfollow fails
          this.logger.error(`FAILED: Unfollow attempt failed: ${unfollowError.message}`, unfollowError.stack);
        }
      } else {
        this.logger.log(`User ${sellerUserId} still has ${remainingTokens} tokens remaining, keeping follow`);
      }

      return {
        success: true,
        transactionHash: tx.hash,
        tokenAddress: dto.tokenAddress,
        sellerAddress: seller.walletAddress,
        amountSold: dto.amountTokens,
        remainingTokens: remainingTokens,
        blockNumber: receipt.blockNumber,
        // saleId: tokenSale.id, // TODO: Uncomment when database recording is enabled
      };

    } catch (error) {
      this.logger.error('Error selling token:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to sell token: ${error.message}`);
    }
  }
}
