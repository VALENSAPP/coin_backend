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
      // Find tokenAddress from UserToken table for the user
      const userToken = await this.prisma.userToken.findFirst({
        where: { userId },
        select: { tokenAddress: true },
        orderBy: { createdAt: 'desc' },
      });

      if (!userToken || !userToken.tokenAddress) {
        throw new BadRequestException('Token address not found for user');
      }

      const tokenAddress = userToken.tokenAddress;

      // Sum tokensReceived from TokenPurchase table for the user where status is 'completed'
      const tokenPurchaseSum = await this.prisma.tokenPurchase.aggregate({
        _sum: {
          tokensReceived: true,
        },
        where: {
          userId,
          status: 'completed',
        },
      });

      const tokenAmount = tokenPurchaseSum._sum.tokensReceived || 0;

      // Get token price from contract using tokenService
      const priceData = await this.tokenService.getPricePerTokenUsd(tokenAddress);
      const tokenPrice = priceData.priceInUsd;

      // Calculate total token amount
      const totalTokenAmount = tokenPrice * tokenAmount;

      return {
        tokenPrice,
        tokenAmount,
        totalTokenAmount,
      };
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
        // Use default coin address if available
        coinAddress = process.env.DEFAULT_COIN_ADDRESS as string;
      }

      if (!coinAddress) {
        this.logger.error('No coin address available for purchase');
        return;
      }

      // Convert amount to wei (usdPaid)
      const usdPaid = ethers.parseEther(tokenPurchase.amount.toString());
      console.log("?????????????????????????????????????????????????????????????????",usdPaid);
      

      // Call buyFor on the smart contract
      const contract = this.tokenService.getContract();
      if (!contract) {
        this.logger.error('Smart contract not initialized');
        return;
      }

      try {
        const tx = await contract.buyFor(coinAddress, user.walletAddress, usdPaid);
        this.logger.log(`BuyFor transaction sent: ${tx.hash} for user ${tokenPurchase.userId}`);

        // Wait for transaction confirmation
        const receipt = await tx.wait();
        this.logger.log(`BuyFor transaction confirmed in block: ${receipt.blockNumber}`);

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
      } catch (blockchainError) {
        this.logger.error('Error calling buyFor on blockchain:', blockchainError);
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
  async getUserTokenHistory(userId: string, tokenAddress?: string) {
    try {
      // Get all purchases for this user (optionally filtered by token)
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

      // Get all sales for this user (optionally filtered by token)
      let saleWhere: any = {
        userId,
        status: 'completed',
      };

      if (tokenAddress) {
        saleWhere.tokenAddress = tokenAddress;
      }

      const sales = await this.prisma.tokenSale.findMany({
        where: saleWhere,
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          tokenAddress: true,
          vendorId: true,
          amountTokensFloat: true,
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
          amount: -sale.amountTokensFloat, // Negative for sales
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

      // Convert USD amount to wei (assuming 1 USD = 1e18 wei for simplicity)
      const usdPaid = ethers.parseEther(dto.userPaid.toString());

      // Call the buyFor method on the smart contract
      const contract = this.tokenService.getContract();

      if (!contract) {
        throw new BadRequestException('Smart contract not initialized');
      }

      const tx = await contract.buyFor(
        userToken.tokenAddress,
        buyer.walletAddress,
        usdPaid
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
        usdPaid: dto.userPaid,
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
      const amountToSell = parseFloat(ethers.formatEther(dto.amountTokens));
      if (amountToSell > totalTokensOwned) {
        throw new BadRequestException(`Insufficient token balance. Owned: ${totalTokensOwned}, Trying to sell: ${amountToSell}`);
      }

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
        value: dto.amountTokens, // Use the amount being sold
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
        dto.amountTokens,
        deadline,
        v,
        r,
        s
      );

      this.logger.log(`SellWithPermit transaction sent: ${tx.hash}`);

      // Wait for transaction confirmation
      const receipt = await tx.wait();

      this.logger.log(`SellWithPermit transaction confirmed in block: ${receipt.blockNumber}`);

      // TODO: Uncomment when Prisma client is regenerated
      // // Record the token sale in database
      // const tokenSale = await this.prisma.tokenSale.create({
      //   data: {
      //     userId: sellerUserId,
      //     tokenAddress: dto.tokenAddress,
      //     vendorId: vendorId,
      //     amountTokens: dto.amountTokens,
      //     amountTokensFloat: amountToSell,
      //     transactionHash: tx.hash,
      //     status: 'completed',
      //   },
      // });

      this.logger.log(`Token sale completed for user ${sellerUserId} (database recording temporarily disabled)`);

      // Check if user is selling all tokens
      const remainingTokens = totalTokensOwned - amountToSell;
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
        amountSold: amountToSell,
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
