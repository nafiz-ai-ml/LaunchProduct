import { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://launchproduct.com';

const CORE_CATEGORIES = [
  'ai-tools',
  'ai-agents',
  'saas',
  'developer-tools',
  'productivity',
  'marketing-tools',
  'seo-tools',
  'design-tools',
];

const SEED_PRODUCTS = [
  'vectorpulse-cloud',
  'devsync-ai',
  'promptcanvas',
  'shipfast-ui',
  'auditshield',
  'databrain-ai',
  'hypermetric-seo',
  'craftflow-design',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // 1. Core Public Routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/leaderboards`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/trending`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/categories`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/submit`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/promote`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/anti-fraud`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
  ];

  // 2. Vertical Taxonomy Categories
  const categoryRoutes: MetadataRoute.Sitemap = CORE_CATEGORIES.map((slug) => ({
    url: `${BASE_URL}/categories/${slug}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  // 3. Verified Product Routes
  const productRoutes: MetadataRoute.Sitemap = SEED_PRODUCTS.map((slug) => ({
    url: `${BASE_URL}/products/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
