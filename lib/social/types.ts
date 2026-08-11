export type SocialPostStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'published';

export type SocialMediaType = 'post' | 'reel' | 'story';

export type SocialPostChannels = {
  linkedin: boolean;
  instagram: boolean;
};

export type SocialPostRow = {
  id: string;
  title: string;
  caption: string;
  image_url: string;
  channels: SocialPostChannels;
  status: SocialPostStatus;
  rejection_reason: string | null;
  submitted_by: string | null;
  created_at: string;
  updated_at: string;
};

export type SocialCampaignRow = {
  id: string;
  campaign_name: string;
  title: string;
  caption: string;
  image_url: string;
  media_type: SocialMediaType;
  channels: SocialPostChannels;
  status: SocialPostStatus;
  metrics: {
    likes: number;
    comments: number;
    impressions: number;
    ctr: number;
    clicks: number;
  };
  scheduled_for: string | null;
  rejection_reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type SocialOverviewMetrics = {
  totalAudienceReach: number;
  platformTrafficLast30Days: number;
  averageEngagementRate: number;
  pendingApproval: number;
  activeCampaigns: number;
  webhookSuccessRate: number | null;
};

export type SocialTrendPoint = {
  date: string;
  reach: number;
  websiteClicks: number;
};

export type TopPerformingContentRow = {
  id: string;
  campaign: string;
  format: SocialMediaType;
  likes: number;
  comments: number;
  clicks: number;
  impressions: number;
  publishDate: string;
};

export type WebhookHealth = {
  linkedin: 'connected' | 'pending';
  instagram: 'connected' | 'pending';
  canva: 'connected' | 'pending';
  canvaUrl: string;
};

export type AdminNotificationRow = {
  id: string;
  entity_type: 'blog_post' | 'social_post' | 'resume_submission';
  entity_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

export type AdminNotificationCounts = {
  blogs: number;
  social: number;
  resumes: number;
  unreadNotifications: number;
  total: number;
};
