import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AIModerationResponse,
  CommentModerationInput,
  ModerationResult,
  PostModerationInput,
  ProductModerationInput,
} from './moderation.types';

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);
  private readonly geminiApiKey?: string;
  private readonly openaiApiKey?: string;
  private readonly provider: 'gemini' | 'openai' | 'auto';

  constructor(private readonly configService: ConfigService) {
    this.geminiApiKey =
      this.configService.get<string>('GEMINI_API_KEY') ||
      process.env.GEMINI_API_KEY;
    this.openaiApiKey =
      this.configService.get<string>('OPENAI_API_KEY') ||
      process.env.OPENAI_API_KEY;

    const configProvider = (
      this.configService.get<string>('AI_MODERATION_PROVIDER') ||
      process.env.AI_MODERATION_PROVIDER ||
      'auto'
    ).toLowerCase();

    if (configProvider === 'gemini' || configProvider === 'openai') {
      this.provider = configProvider;
    } else {
      this.provider = 'auto';
    }
  }

  /**
   * Evaluate a post for relevance and content safety guidelines
   */
  async evaluatePost(input: PostModerationInput): Promise<ModerationResult> {
    const textPieces = [
      input.text ? `Text: ${input.text}` : '',
      input.caption ? `Caption: ${input.caption}` : '',
      input.hashtag && input.hashtag.length > 0 ? `Hashtags: ${input.hashtag.join(', ')}` : '',
      input.type ? `Post Type: ${input.type}` : '',
      input.format ? `Format: ${input.format}` : '',
    ].filter(Boolean);

    const fullText = textPieces.join('\n');
    const images = (input.images || []).filter((img) => typeof img === 'string' && img.startsWith('http'));

    const systemPrompt = `You are an AI Content Moderator for a social & marketplace platform (Valens).
Your task is to evaluate posts uploaded by users.

Evaluate against 2 core criteria:
1. RELEVANCE & INTEGRITY (isRelevant):
   - Reject/flag: Gibberish/keyboard smash (e.g. "asdfghjkl", "111111"), spam links, bot promotions, pump-and-dump crypto shilling, fraudulent schemes, or completely off-topic nonsense.
   - Normal personal thoughts, stories, creative posts, media sharing, crowdfunding, questions, and community interactions ARE RELEVANT.
2. SAFETY & COMMUNITY STANDARDS (isSafe):
   - Reject/flag: Hate speech, severe harassment/bullying, sexual/pornographic/NSFW content, extreme gore/violence/weapons, illegal drugs/contraband, scam flyers, phishing.

Respond strictly in valid JSON format:
{
  "isRelevant": boolean,
  "isSafe": boolean,
  "confidence": number (0.0 to 1.0),
  "flags": string[] (e.g. ["spam", "gibberish", "nsfw", "hate_speech", "off_topic"]),
  "reason": string (short human-readable explanation)
}`;

    const userPrompt = `Evaluate this POST:
${fullText || '(No text provided, only media)'}
${images.length > 0 ? `Attached Image URLs: ${images.slice(0, 3).join(', ')}` : ''}`;

    return this.runAIModeration(systemPrompt, userPrompt, images);
  }

  /**
   * Evaluate a comment for relevance and safety
   */
  async evaluateComment(input: CommentModerationInput): Promise<ModerationResult> {
    const systemPrompt = `You are an AI Content Moderator for a social & marketplace platform.
Evaluate this user comment/reply.

Criteria:
1. isRelevant: Is the comment coherent text? (Reject gibberish spam, link dumps, bot scams).
2. isSafe: Is the comment free from hate speech, harassment, severe toxicity, threats, and NSFW/scam links?

Respond strictly in valid JSON format:
{
  "isRelevant": boolean,
  "isSafe": boolean,
  "confidence": number (0.0 to 1.0),
  "flags": string[],
  "reason": string
}`;

    const userPrompt = `Comment to evaluate: "${input.comment}"
${input.postText ? `Original Post Context: "${input.postText.slice(0, 200)}"` : ''}`;

    return this.runAIModeration(systemPrompt, userPrompt, []);
  }

  /**
   * Evaluate a product/closet item for valid marketplace listing
   */
  async evaluateProduct(input: ProductModerationInput): Promise<ModerationResult> {
    const productInfo = [
      `Product Name: ${input.name}`,
      `Category: ${input.category}`,
      input.brand ? `Brand: ${input.brand}` : '',
      input.description ? `Description: ${input.description}` : '',
      input.price !== null && input.price !== undefined ? `Price: $${input.price}` : '',
    ].filter(Boolean).join('\n');

    const images = (input.images || []).filter((img) => typeof img === 'string' && img.startsWith('http'));

    const systemPrompt = `You are an AI Marketplace Moderator for a fashion & lifestyle closet/shop platform.
Evaluate this product listing.

Criteria:
1. isRelevant:
   - Must be a genuine product listing (e.g. clothing, shoes, accessories, books, electronics, decor).
   - Reject/flag: Gibberish/fake test items, off-platform solicitations, services not suitable for closet shopping, spam.
2. isSafe:
   - Reject/flag: Illegal goods, weapons, prescription drugs, counterfeit promotion, adult/NSFW items, fraudulent items.

Respond strictly in valid JSON format:
{
  "isRelevant": boolean,
  "isSafe": boolean,
  "confidence": number (0.0 to 1.0),
  "flags": string[],
  "reason": string
}`;

    const userPrompt = `Product Details:
${productInfo}
${images.length > 0 ? `Product Images: ${images.slice(0, 3).join(', ')}` : ''}`;

    return this.runAIModeration(systemPrompt, userPrompt, images);
  }

  /**
   * Run AI moderation using available provider (Gemini or OpenAI) with fallback
   */
  private async runAIModeration(
    systemPrompt: string,
    userPrompt: string,
    imageUrls: string[] = [],
  ): Promise<ModerationResult> {
    const activeProvider = this.getActiveProvider();

    if (activeProvider === 'gemini' && this.geminiApiKey) {
      try {
        const result = await this.callGeminiAPI(systemPrompt, userPrompt, imageUrls);
        return this.formatVerdict(result, 'AI_GEMINI');
      } catch (err) {
        this.logger.error('Gemini Moderation API error:', err);
      }
    }

    if (activeProvider === 'openai' && this.openaiApiKey) {
      try {
        const result = await this.callOpenAIAPI(systemPrompt, userPrompt, imageUrls);
        return this.formatVerdict(result, 'AI_OPENAI');
      } catch (err) {
        this.logger.error('OpenAI Moderation API error:', err);
      }
    }

    // Try alternate if primary failed
    if (this.geminiApiKey && activeProvider !== 'gemini') {
      try {
        const result = await this.callGeminiAPI(systemPrompt, userPrompt, imageUrls);
        return this.formatVerdict(result, 'AI_GEMINI');
      } catch (err) {
        this.logger.error('Fallback Gemini Moderation API error:', err);
      }
    }

    if (this.openaiApiKey && activeProvider !== 'openai') {
      try {
        const result = await this.callOpenAIAPI(systemPrompt, userPrompt, imageUrls);
        return this.formatVerdict(result, 'AI_OPENAI');
      } catch (err) {
        this.logger.error('Fallback OpenAI Moderation API error:', err);
      }
    }

    // If no API keys configured or external services failed, run local rule heuristic
    return this.runLocalRules(userPrompt);
  }

  private getActiveProvider(): 'gemini' | 'openai' | 'none' {
    if (this.provider === 'gemini' && this.geminiApiKey) return 'gemini';
    if (this.provider === 'openai' && this.openaiApiKey) return 'openai';
    if (this.geminiApiKey) return 'gemini';
    if (this.openaiApiKey) return 'openai';
    return 'none';
  }

  /**
   * Call Google Gemini API (REST)
   */
  private async callGeminiAPI(
    systemPrompt: string,
    userPrompt: string,
    imageUrls: string[] = [],
  ): Promise<AIModerationResponse> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.geminiApiKey}`;

    const parts: any[] = [
      { text: `${systemPrompt}\n\n${userPrompt}\n\nRespond ONLY with valid JSON.` },
    ];

    const body = {
      contents: [{ parts }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API returned ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new Error('Gemini API returned empty response');
    }

    return JSON.parse(rawText) as AIModerationResponse;
  }

  /**
   * Call OpenAI API (REST)
   */
  private async callOpenAIAPI(
    systemPrompt: string,
    userPrompt: string,
    imageUrls: string[] = [],
  ): Promise<AIModerationResponse> {
    const endpoint = 'https://api.openai.com/v1/chat/completions';

    const contentArray: any[] = [{ type: 'text', text: userPrompt }];
    for (const url of imageUrls.slice(0, 2)) {
      contentArray.push({
        type: 'image_url',
        image_url: { url, detail: 'low' },
      });
    }

    const body = {
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: contentArray },
      ],
      temperature: 0.1,
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.openaiApiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API returned ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI API returned empty content');
    }

    return JSON.parse(content) as AIModerationResponse;
  }

  /**
   * Rule-based fallback when AI APIs are unavailable or not yet configured
   */
  private runLocalRules(userPrompt: string): ModerationResult {
    const text = userPrompt.toLowerCase();

    // Basic heuristic spam/gibberish detection
    const repeatedLetters = /(.)\1{9,}/.test(text); // e.g. aaaaaaaaaa
    const explicitBadWords = ['kill yourself', 'free money click here', 'telegram bot scam', 'crypto hack tool'];
    const hasBadPhrase = explicitBadWords.some((w) => text.includes(w));

    if (repeatedLetters || hasBadPhrase) {
      return {
        status: 'PENDING_APPROVAL',
        reason: hasBadPhrase
          ? 'Flagged by automated rule: prohibited terms detected'
          : 'Flagged by automated rule: repetitive characters/potential spam',
        score: 0.9,
        flaggedLabels: ['automated_rule_violation'],
        moderatedBy: 'SYSTEM_RULES_LOCAL',
      };
    }

    return {
      status: 'APPROVED',
      reason: 'Auto-approved (Clean)',
      score: 1.0,
      flaggedLabels: [],
      moderatedBy: 'SYSTEM_RULES_LOCAL',
    };
  }

  /**
   * Format AI response into standardized ModerationResult
   */
  private formatVerdict(aiRes: AIModerationResponse, provider: string): ModerationResult {
    const isApproved = aiRes.isRelevant === true && aiRes.isSafe === true;

    return {
      status: isApproved ? 'APPROVED' : 'PENDING_APPROVAL',
      reason: aiRes.reason || (isApproved ? 'Approved by AI' : 'Flagged for admin review'),
      score: aiRes.confidence || 0.9,
      flaggedLabels: aiRes.flags || [],
      moderatedBy: provider,
    };
  }
}
