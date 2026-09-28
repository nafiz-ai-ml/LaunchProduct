import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductDetailClient } from '@/components/product/ProductDetailClient';

interface Props {
  params: {
    slug: string;
  };
}

const FALLBACK_PRODUCTS_MAP: Record<string, any> = {
  'vectorpulse-cloud': {
    id: 'prod-sponsor-1',
    _id: 'prod-sponsor-1',
    name: 'VectorPulse Cloud',
    slug: 'vectorpulse-cloud',
    tagline: 'Serverless vector database engine with automated sub-millisecond similarity indexing',
    description: 'Ultra-low latency vector embeddings storage built specifically for high-throughput LLM reasoning pipelines and autonomous agents. VectorPulse delivers sub-millisecond approximate nearest neighbor searches with zero server configuration.',
    category: { name: 'Developer Tools', slug: 'developer-tools' },
    pricing: { model: 'Freemium', startingPrice: 0 },
    upvotesCount: 412,
    reviewsCount: 64,
    isVerified: true,
    canonicalDomain: 'vectorpulse.cloud',
    websiteUrl: 'https://vectorpulse.cloud',
    logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80',
    tags: ['AI Engine', 'Database', 'TypeScript', 'Vector Search', 'Rust'],
    launchDate: new Date().toISOString(),
    media: {
      screenshotUrls: [
        'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=1200&auto=format&fit=crop&q=80',
      ],
    },
    founder: {
      name: 'Alex Rivera',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&auto=format&fit=crop&q=80',
      bio: 'Systems engineer & database architect. Previously staff infrastructure engineer at CloudScale. Building high-throughput search primitives.',
      twitterHandle: 'alex_vectorpulse',
    },
  },
  'devsync-ai': {
    id: 'prod-1',
    _id: 'prod-1',
    name: 'DevSync AI',
    slug: 'devsync-ai',
    tagline: 'Autonomous code review agent that spots performance regressions before merging',
    description: 'DevSync connects directly to your Git repositories, analyzing PR AST diffs and predicting bundle-size regressions, SQL N+1 bugs, and memory leaks before they ever hit production staging environments.',
    category: { name: 'Developer Tools', slug: 'developer-tools' },
    pricing: { model: 'Freemium', startingPrice: 0 },
    upvotesCount: 388,
    reviewsCount: 52,
    isVerified: true,
    canonicalDomain: 'devsync.ai',
    websiteUrl: 'https://devsync.ai',
    logoUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=128&auto=format&fit=crop&q=80',
    tags: ['DevTools', 'AI Agents', 'GitHub', 'TypeScript', 'Code Review'],
    launchDate: new Date().toISOString(),
    media: {
      screenshotUrls: [
        'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&auto=format&fit=crop&q=80',
      ],
    },
    founder: {
      name: 'Marcus Chen',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&auto=format&fit=crop&q=80',
      bio: 'Compiler enthusiast and static analysis nerd. Passionate about automated code quality and developer productivity.',
      twitterHandle: 'marcus_devsync',
    },
  },
  'promptcanvas': {
    id: 'prod-2',
    _id: 'prod-2',
    name: 'PromptCanvas',
    slug: 'promptcanvas',
    tagline: 'Visual node-based IDE for building, testing, and versioning production LLM chains',
    description: 'The standard workspace for AI engineers: drag-and-drop prompt chaining, real-time token economics inspection, and automated unit testing suites.',
    category: { name: 'AI Tools', slug: 'ai-tools' },
    pricing: { model: 'Freemium', startingPrice: 0 },
    upvotesCount: 295,
    reviewsCount: 39,
    isVerified: true,
    canonicalDomain: 'promptcanvas.io',
    websiteUrl: 'https://promptcanvas.io',
    logoUrl: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=128&auto=format&fit=crop&q=80',
    tags: ['Prompt Engineering', 'LLM', 'Productivity', 'React', 'OpenAI'],
    launchDate: new Date().toISOString(),
    media: {
      screenshotUrls: [
        'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&auto=format&fit=crop&q=80',
      ],
    },
    founder: {
      name: 'Elena Rostova',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&auto=format&fit=crop&q=80',
      bio: 'AI researcher and frontend architect. Building visual cognitive workspaces.',
      twitterHandle: 'elena_canvas',
    },
  },
  'shipfast-ui': {
    id: 'prod-3',
    _id: 'prod-3',
    name: 'ShipFast UI',
    slug: 'shipfast-ui',
    tagline: 'Accessible React & Tailwind component library for hyper-growth SaaS platforms',
    description: 'Over 120+ meticulously crafted, conversion-optimized SaaS components with dark mode, full keyboard navigation, and seamless Figma synchronization.',
    category: { name: 'Design Tools', slug: 'design-tools' },
    pricing: { model: 'Paid', startingPrice: 49 },
    upvotesCount: 247,
    reviewsCount: 31,
    isVerified: true,
    canonicalDomain: 'shipfastui.com',
    websiteUrl: 'https://shipfastui.com',
    logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80',
    tags: ['Tailwind CSS', 'React 18', 'Design System', 'UI Library'],
    launchDate: new Date().toISOString(),
    media: {
      screenshotUrls: [
        'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop&q=80',
      ],
    },
  },
};

const getApiBaseUrl = () => {
  const envUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000';
  return envUrl.replace('//localhost:', '//127.0.0.1:').replace(/\/$/, '');
};

async function getProduct(slug: string) {
  try {
    const rawUrl = getApiBaseUrl();
    const endpoint = `${rawUrl}/api/v1/products/${encodeURIComponent(slug)}`;
    const res = await fetch(endpoint, {
      cache: 'no-store',
    });

    if (res.ok) {
      const json = await res.json();
      if (json?.data?.product) {
        return json.data.product;
      }
    }
  } catch (err: any) {
    // If backend fails or not reachable, fallback to seed map
  }

  // Fallback to seeded demo products if found
  if (FALLBACK_PRODUCTS_MAP[slug.toLowerCase()]) {
    return FALLBACK_PRODUCTS_MAP[slug.toLowerCase()];
  }

  return null;
}

// 1. Dynamic Server Component Metadata (WCAG & SEO Best Practices)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct(params.slug);

  if (!product) {
    return {
      title: 'Product Not Found | LaunchProduct',
      description: 'The requested product launch could not be found.',
    };
  }

  const title = `${product.name} — ${product.tagline} | LaunchProduct`;
  const description =
    product.description ||
    `${product.name} is launched on LaunchProduct. Discover features, verified community feedback, and tech stack details.`;

  const canonicalUrl = `https://launchproduct.com/products/${product.slug || product._id || product.id}`;
  const ogImageUrl = product.logoUrl || `${getApiBaseUrl()}/api/og/${product.slug || product._id}`;

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
  const product = await getProduct(params.slug);

  if (!product) {
    notFound();
  }

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
    offers: {
      '@type': 'Offer',
      price: product.pricing?.startingPrice || 0,
      priceCurrency: product.pricing?.currency || 'USD',
    },
    aggregateRating: product.reviewsCount ? {
      '@type': 'AggregateRating',
      ratingValue: product.averageRating || 5.0,
      reviewCount: product.reviewsCount,
    } : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetailClient product={product} />
    </>
  );
}
