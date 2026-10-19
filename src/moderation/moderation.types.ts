export type ModerationStatusType = 'APPROVED' | 'PENDING_APPROVAL' | 'REJECTED';

export type ModerationContentTypeValue =
  | 'POST'
  | 'COMMENT'
  | 'PRODUCT'
  | 'EBOOK'
  | 'BATTLE'
  | 'BATTLE_COMMENT'
  | 'DM'
  | 'USER'
  | 'OTHER';

export type ModerationDecisionType = 'ALLOW' | 'WARN' | 'BLOCK' | 'REVIEW';

export type SeverityLevel = 0 | 1 | 2 | 3 | 4;

export type AccountStandingType =
  | 'GOOD'
  | 'WARNING'
  | 'RESTRICTED'
  | 'SUSPENDED'
  | 'BANNED';

export interface ModerationResult {
  status: ModerationStatusType;
  reason?: string | null;
  score?: number | null;
  flaggedLabels?: string[];
  moderatedBy: string;
}

export interface PostModerationInput {
  text?: string | null;
  caption?: string | null;
  hashtag?: string[];
  images?: string[];
  type?: string | null;
  format?: string | null;
}

export interface CommentModerationInput {
  comment: string;
  postText?: string | null;
}

export interface ProductModerationInput {
  name: string;
  category: string;
  description?: string | null;
  brand?: string | null;
  images?: string[];
  price?: number | null;
}

export interface AIModerationResponse {
  isRelevant: boolean;
  isSafe: boolean;
  confidence: number;
  flags: string[];
  reason: string;
}

export interface ModerationCheckInput {
  user_id: string;
  content_id: string;
  content_type: string;
  feature: string;
  text: string;
  media_refs?: string[];
  language?: string;
  reply_to_content_id?: string;
  context_ids?: string[];
}

export interface ModerationCheckResult {
  decision: ModerationDecisionType;
  risk_level: SeverityLevel;
  categories: string[];
  confidence: number;
  reason_code: string;
  human_review_required: boolean;
  case_id?: string;
}

export interface PolicyEvaluation {
  decision: ModerationDecisionType;
  severity: SeverityLevel;
  categories: string[];
  reasonCode: string;
  humanReviewRequired: boolean;
  explanation: string;
}
