import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductDetailClient } from '@/components/product/ProductDetailClient';
import { safeJsonLd } from '@/lib/safe-json-ld';

interface Props {
  params: {
    slug: string;
  };
}

const FALLBACK_PRODUCTS_MAP: Record<string, any> = {
  'see-io': {
    id: 'prod-see-io',
    _id: 'prod-see-io',
    name: 'see.io',
    slug: 'see-io',
    tagline: 'see your idea live',
    description: 'Just describe your idea. AI turns it into a fully built, live website in minutes. Get your own domain whenever you want one. No coding required.',
    canonicalDomain: 'see.io',
    websiteUrl: 'https://see.io',
    logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80',
    category: { name: 'AI Agents & Infrastructure', slug: 'ai-agents' },
    paidRankingAmountCents: 1700100,
    stats: {
      categoryRank: 1,
      categoryTotal: 166,
      overallRank: 1,
      overallTotal: 3147,
      clicksCount: 68064,
      raisedCount: 4,
      hasRankedToday: false,
      todayRank: null,
      outbidCostToBeatCategoryTop: 17006,
    },
    relatedProducts: [
      {
        id: 'prod-2',
        name: 'JONI',
        tagline: 'Your Personal AI Computer',
        slug: 'joni',
        paidRankingAmountCents: 1402800,
        formattedAmount: '$14,028',
        logoUrl: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=128&auto=format&fit=crop&q=80',
        categoryRank: 2,
      },
      {
        id: 'prod-3',
        name: 'Pecan AI',
        tagline: 'Predictive AI Agent for Business Teams',
        slug: 'pecan-ai',
        paidRankingAmountCents: 375000,
        formattedAmount: '$3,750',
        logoUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=128&auto=format&fit=crop&q=80',
        categoryRank: 3,
      },
      {
        id: 'prod-4',
        name: 'Unify',
        tagline: 'AI teammates for everyone else',
        slug: 'unify',
        paidRankingAmountCents: 312500,
        formattedAmount: '$3,125',
        logoUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=128&auto=format&fit=crop&q=80',
        categoryRank: 4,
      },
      {
        id: 'prod-5',
        name: 'FangCode',
        tagline: 'Cheap Coding Agent for Everyone',
        slug: 'fangcode',
        paidRankingAmountCents: 200100,
        formattedAmount: '$2,001',
        logoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&auto=format&fit=crop&q=80',
        categoryRank: 5,
      },
    ],
  },
  'vectorpulse-cloud': {
    id: 'prod-sponsor-1',
    _id: 'prod-sponsor-1',
    name: 'VectorPulse Cloud',
    slug: 'vectorpulse-cloud',
    tagline: 'Serverless vector database engine with automated sub-millisecond similarity indexing',
    description: 'Ultra-low latency vector embeddings storage built specifically for high-throughput LLM reasoning pipelines and autonomous agents. VectorPulse delivers sub-millisecond approximate nearest neighbor searches with zero server configuration.',
    category: { name: 'Developer Tools', slug: 'developer-tools' },
    canonicalDomain: 'vectorpulse.cloud',
    websiteUrl: 'https://vectorpulse.cloud',
    logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80',
    paidRankingAmountCents: 1200000,
    stats: {
      categoryRank: 1,
      categoryTotal: 98,
      overallRank: 6,
      overallTotal: 3147,
      clicksCount: 19400,
      raisedCount: 3,
      hasRankedToday: false,
      todayRank: null,
      outbidCostToBeatCategoryTop: 12005,
    },
    relatedProducts: [],
  },
};

const getApiBaseUrl = () => {
  const envUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000';
  return envUrl.replace('//localhost:', '//127.0.0.1:').replace(/\/$/, '');
};

async function getProductData(slug: string) {
  try {
    const rawUrl = getApiBaseUrl();
    const endpoint = `${rawUrl}/api/v1/products/${encodeURIComponent(slug)}`;
    const res = await fetch(endpoint, {
      cache: 'no-store',
    });

    if (res.ok) {
      const json = await res.json();
      if (json?.data?.product) {
        return {
          product: json.data.product,
          stats: json.data.stats || null,
          relatedProducts: json.data.relatedProducts || [],
        };
      }
    }
  } catch {
    // If backend fails or not reachable, fallback to seed map
  }

  // Fallback to seeded demo products if found
  const fallback = FALLBACK_PRODUCTS_MAP[slug.toLowerCase()];
  if (fallback) {
    return {
      product: fallback,
      stats: fallback.stats,
      relatedProducts: fallback.relatedProducts || [],
    };
  }

  return null;
}

// 1. Dynamic Server Component Metadata (WCAG & SEO Best Practices)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getProductData(params.slug);

  if (!data?.product) {
    return {
      title: 'Product Not Found | LaunchProduct',
      description: 'The requested product launch could not be found.',
    };
  }

  const { product } = data;
  const title = `${product.name} — ${product.tagline} | LaunchProduct`;
  const description =
    product.description ||
    `${product.name} is listed on LaunchProduct. Discover real-time pay-to-rank statistics and transparent community metrics.`;

  const canonicalUrl = `https://launchproduct.com/products/${product.slug || product._id || product.id}`;
  const ogImageUrl = product.logoUrl || `https://www.google.com/s2/favicons?domain=${product.canonicalDomain}&sz=128`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: 'website',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${product.name} on LaunchProduct`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

// Main Page Server Component
export default async function ProductPage({ params }: Props) {
  const data = await getProductData(params.slug);

  if (!data?.product) {
    notFound();
  }

  const { product, stats, relatedProducts } = data;

  const categoryName =
    typeof product.category === 'object' && product.category !== null
      ? product.category.name
      : product.category || 'Software';

  // Truthful SoftwareApplication JSON-LD Structured Data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: product.name,
    headline: product.tagline,
    description: product.description,
    applicationCategory: categoryName,
    operatingSystem: 'Web',
    url: product.websiteUrl,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <ProductDetailClient
        product={product}
        stats={stats}
        relatedProducts={relatedProducts}
      />
    </>
  );
}
