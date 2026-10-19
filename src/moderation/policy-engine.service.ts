import { Injectable, Logger } from '@nestjs/common';
import {
  AIModerationResponse,
  ModerationDecisionType,
  PolicyEvaluation,
  SeverityLevel,
} from './moderation.types';

@Injectable()
export class PolicyEngineService {
  private readonly logger = new Logger(PolicyEngineService.name);

  // Critical keywords/flags for immediate Severity 4 safety intervention
  private readonly criticalCategories = [
    'child_exploitation',
    'child_abuse',
    'child_safety',
    'csam',
    'suicide',
    'self_harm',
    'terrorism',
    'credible_violence',
    'bomb_threat',
    'mass_violence',
  ];

  // Severity 3 categories (Severe Hate, Direct Threats, Severe Harassment, Doxxing)
  private readonly severeCategories = [
    'hate_speech',
    'hate_attack',
    'racial_slur',
    'doxxing',
    'intimidation',
    'sexual_violence',
    'blackmail',
  ];

  // Severity 2 categories (Targeted Harassment, Scams, High-risk Fraud)
  private readonly targetedCategories = [
    'harassment',
    'targeted_insult',
    'bullying',
    'scam',
    'crypto_scam',
    'phishing',
    'fraud',
    'nsfw',
    'pornography',
  ];

  // Severity 1 categories (Mild profanity, borderline toxicity, spam)
  private readonly mildCategories = [
    'profanity',
    'vulgarity',
    'heated_argument',
    'spam_caption',
    'gibberish',
    'inappropriate_caption',
    'off_topic',
  ];

  /**
   * Evaluate AI signals and platform policy to produce a normalized decision
   */
  evaluate(
    ai: AIModerationResponse,
    context: {
      feature?: string;
      userStanding?: string;
      priorViolationsCount?: number;
    } = {},
  ): PolicyEvaluation {
    const flags = (ai.flags || []).map((f) => f.toLowerCase());
    const confidence = ai.confidence || 0.5;

    // 1. Check for Severity 4: Critical safety events
    const hasCritical = flags.some((flag) =>
      this.criticalCategories.some((crit) => flag.includes(crit)),
    );
    if (hasCritical) {
      return {
        decision: 'BLOCK',
        severity: 4,
        categories: ['child_safety', 'credible_violence'],
        reasonCode: 'CRITICAL_SAFETY_VIOLATION',
        humanReviewRequired: true,
        explanation: 'Critical safety violation detected requiring immediate human escalation.',
      };
    }

    // 2. Check for Severity 3: Hate attack, severe harassment, doxxing
    const hasSevere = flags.some((flag) =>
      this.severeCategories.some((sev) => flag.includes(sev)),
    );
    if (hasSevere && confidence >= 0.6) {
      return {
        decision: 'BLOCK',
        severity: 3,
        categories: ['hate_speech', 'harassment'],
        reasonCode: 'HATE_OR_SEVERE_HARASSMENT',
        humanReviewRequired: true,
        explanation: 'Severe violation of Valens Community Standards.',
      };
    }

    // 3. Check for Severity 2: Targeted insults, harassment, scams
    const hasTargeted = flags.some((flag) =>
      this.targetedCategories.some((t) => flag.includes(t)),
    );
    if (hasTargeted) {
      // High confidence -> BLOCK, Borderline -> WARN
      const decision: ModerationDecisionType = confidence >= 0.75 ? 'BLOCK' : 'WARN';
      return {
        decision,
        severity: 2,
        categories: flags.filter((f) => this.targetedCategories.some((t) => f.includes(t))),
        reasonCode: decision === 'BLOCK' ? 'HARASSMENT_TARGETED_HIGH' : 'HARASSMENT_TARGETED_LOW',
        humanReviewRequired: decision === 'BLOCK',
        explanation:
          decision === 'BLOCK'
            ? 'Targeted harassment or fraud is not permitted.'
            : 'Content contains heated language. Think before you post.',
      };
    }

    // 4. Check for Severity 1: Profanity, borderline toxicity, spam
    const hasMild =
      !ai.isSafe ||
      !ai.isRelevant ||
      flags.some((flag) => this.mildCategories.some((m) => flag.includes(m)));

    if (hasMild) {
      // For borderline profanity or irrelevant text, WARN the user (or ALLOW if low confidence)
      const decision: ModerationDecisionType = confidence >= 0.65 ? 'WARN' : 'ALLOW';
      return {
        decision,
        severity: 1,
        categories: flags.length > 0 ? flags : ['mild_profanity'],
        reasonCode: decision === 'WARN' ? 'PROFANITY_BORDERLINE' : 'SAFE_MILD_DISAGREEMENT',
        humanReviewRequired: false,
        explanation:
          decision === 'WARN'
            ? 'Please review community standards regarding respectful communication.'
            : 'Content is permissible.',
      };
    }

    // 5. Severity 0: Safe
    return {
      decision: 'ALLOW',
      severity: 0,
      categories: [],
      reasonCode: 'SAFE_APPROVED',
      humanReviewRequired: false,
      explanation: 'Content complies with Valens Community Standards.',
    };
  }
}
