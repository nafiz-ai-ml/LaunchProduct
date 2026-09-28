export interface FounderProduct {
  id: string;
  _id?: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  websiteUrl: string;
  logoUrl?: string;
  media?: {
    logoUrl?: string;
    bannerUrl?: string;
    screenshotUrls?: string[];
  };
  upvotesCount: number;
  status?: string;
  launchDate?: string;
  isFeatured?: boolean;
}

export type BadgeStyle = 'dark' | 'light' | 'pill';

export interface DailyMetricItem {
  date: string;
  impressions: number;
  organicClicks: number;
  sponsoredClicks?: number;
  votes: number;
}

export interface ReferrerMetricItem {
  referrer: string;
  count: number;
}
