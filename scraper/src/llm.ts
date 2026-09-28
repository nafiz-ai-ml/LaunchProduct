import OpenAI from 'openai';
import { ScrapedMetadata } from './parser';

export const MVP_CATEGORY_SLUGS = [
  'ai-tools',
  'ai-agents',
  'saas',
  'developer-tools',
  'productivity',
  'marketing-tools',
  'seo-tools',
  'design-tools',
] as const;

export type MvpCategorySlug = (typeof MVP_CATEGORY_SLUGS)[number];
export type PricingModelType = 'free' | 'freemium' | 'paid' | 'open_source';

export interface AIEnrichedMetadata {
  suggestedName: string;
  tagline: string;
  description: string;
  categorySlug: MvpCategorySlug;
  pricingModel: PricingModelType;
  startingPrice: number | null;
  bulletPoints: string[];
}

/**
 * Intelligent heuristic fallback when OpenAI API key is unavailable or fails
 */
function generateFallbackMetadata(
  scraped: ScrapedMetadata,
  targetUrl: string
): AIEnrichedMetadata {
  let name = scraped.title.split(/[-–—|:]/)[0]?.trim() || '';
  if (name.length < 2 || name.length > 100) {
    try {
      const hostname = new URL(targetUrl).hostname.replace(/^www\./, '');
      name = hostname.split('.')[0] || 'Product';
      name = name.charAt(0).toUpperCase() + name.slice(1);
    } catch {
      name = 'Product';
    }
  }

  let tagline = scraped.description || 'Modern software application and productivity platform';
  if (tagline.length > 120) {
    tagline = tagline.substring(0, 117) + '...';
  }
  if (tagline.length < 10) {
    tagline = 'Next-generation intelligent software tool';
  }

  // Detect category keywords
  const text = (scraped.title + ' ' + scraped.description + ' ' + scraped.bodyText).toLowerCase();
  let categorySlug: MvpCategorySlug = 'saas';

  if (text.includes('agent') || text.includes('autonomous')) {
    categorySlug = 'ai-agents';
  } else if (text.includes('ai') || text.includes('gpt') || text.includes('llm') || text.includes('machine learning')) {
    categorySlug = 'ai-tools';
  } else if (text.includes('developer') || text.includes('api') || text.includes('sdk') || text.includes('code') || text.includes('git')) {
    categorySlug = 'developer-tools';
  } else if (text.includes('design') || text.includes('ui') || text.includes('ux') || text.includes('figma')) {
    categorySlug = 'design-tools';
  } else if (text.includes('seo') || text.includes('keyword') || text.includes('backlink')) {
    categorySlug = 'seo-tools';
  } else if (text.includes('marketing') || text.includes('ad') || text.includes('campaign')) {
    categorySlug = 'marketing-tools';
  } else if (text.includes('productivity') || text.includes('task') || text.includes('note') || text.includes('calendar')) {
    categorySlug = 'productivity';
  }

  return {
    suggestedName: name,
    tagline,
    description: scraped.description || scraped.bodyText.substring(0, 500) || tagline,
    categorySlug,
    pricingModel: 'freemium',
    startingPrice: 0,
    bulletPoints: [
      'Automated product workflow management',
      'High-performance cloud-native infrastructure',
      'Modern, intuitive user experience',
    ],
  };
}

/**
 * Enriches scraped page metadata using OpenAI GPT-4o JSON mode
 */
export async function enrichWithAI(
  scrapedData: ScrapedMetadata,
  targetUrl: string
): Promise<AIEnrichedMetadata> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || apiKey.trim() === '' || apiKey.startsWith('sk-test-mock')) {
    console.log('[LLM] OpenAI API key not configured, using intelligent heuristic extractor');
    return generateFallbackMetadata(scrapedData, targetUrl);
  }

  const openai = new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  });

  const prompt = `You are a Senior Product Discovery Analyst for LaunchProduct. Analyze this scraped website metadata and return a strictly valid JSON object matching the required schema.

Website URL: ${targetUrl}
Canonical Domain: ${scrapedData.canonicalDomain}
Page Title: ${scrapedData.title}
Page Description: ${scrapedData.description}
Extracted Body Content: ${scrapedData.bodyText.substring(0, 1500)}

Allowed categorySlug values (MUST choose exactly one):
${MVP_CATEGORY_SLUGS.map((slug) => `"${slug}"`).join(', ')}

Allowed pricingModel values:
"free", "freemium", "paid", "open_source"

Requirements:
- suggestedName: Clean official brand/product name (2-100 chars, no taglines).
- tagline: Punchy value proposition (10-120 chars).
- description: Comprehensive overview of the product, problem solved, and key features (50-500 words).
- categorySlug: The single most accurate category slug from the allowed list.
- pricingModel: One of the allowed pricingModel values.
- startingPrice: Monthly starting price in USD (number or null if free/open source).
- bulletPoints: 3 to 5 distinct key features or product highlights.

Return ONLY the JSON object.`;

  try {
    const model = process.env.OPENAI_MODEL || 'gpt-4o';
    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert product analyst that returns strictly formatted JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    const parsed = JSON.parse(content);

    // Validate and coerce category
    let categorySlug: MvpCategorySlug = 'saas';
    if (MVP_CATEGORY_SLUGS.includes(parsed.categorySlug)) {
      categorySlug = parsed.categorySlug;
    }

    let pricingModel: PricingModelType = 'freemium';
    if (['free', 'freemium', 'paid', 'open_source'].includes(parsed.pricingModel)) {
      pricingModel = parsed.pricingModel;
    }

    return {
      suggestedName: String(parsed.suggestedName || scrapedData.title).substring(0, 100).trim(),
      tagline: String(parsed.tagline || scrapedData.description).substring(0, 120).trim(),
      description: String(parsed.description || scrapedData.bodyText).trim(),
      categorySlug,
      pricingModel,
      startingPrice: typeof parsed.startingPrice === 'number' ? parsed.startingPrice : null,
      bulletPoints: Array.isArray(parsed.bulletPoints)
        ? parsed.bulletPoints.map((b: unknown) => String(b)).slice(0, 5)
        : ['Fast and intuitive setup', 'Cloud-ready architecture', 'Seamless collaboration'],
    };
  } catch (error) {
    console.error('[LLM Error] OpenAI completion failed, falling back to heuristic parsing:', error);
    return generateFallbackMetadata(scrapedData, targetUrl);
  }
}

export default enrichWithAI;
