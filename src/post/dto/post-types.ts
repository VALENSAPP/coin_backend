export const POST_TYPES = [
  'normal',
  'crowdfunding',
  'support',
  'mission-post',
  'reel',
  'private',
  'subscription_content',
] as const;

export type PostType = (typeof POST_TYPES)[number];
