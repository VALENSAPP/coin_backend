export type ModerationStatusType = 'APPROVED' | 'PENDING_APPROVAL' | 'REJECTED';

export type ModerationContentTypeValue = 'POST' | 'COMMENT' | 'PRODUCT' | 'EBOOK';

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
