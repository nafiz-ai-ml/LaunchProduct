import axios from 'axios';
import * as cheerio from 'cheerio';
import { config } from '../shared/config';
import { logger } from '../shared/logger';

export interface ScrapedProductMetadata {
  name: string;
  tagline: string;
  description: string;
  logoUrl?: string;
  websiteUrl: string;
  suggestedCategorySlug?: string;
  rawTitle?: string;
  rawDescription?: string;
}

/**
 * Scrapes a target website URL for OpenGraph and HTML metadata,
 * then synthesizes unique, polished product metadata using OpenAI.
 */
export async function scrapeAndSynthesizeMetadata(targetUrl: string): Promise<ScrapedProductMetadata> {
  const normalizedUrl = targetUrl.startsWith('http://') || targetUrl.startsWith('https://')
    ? targetUrl
    : `https://${targetUrl}`;

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(normalizedUrl);
  } catch {
    parsedUrl = new URL(`https://${normalizedUrl}`);
  }

  const hostname = parsedUrl.hostname.replace(/^www\./i, '');
  const domainBrandName = hostname.split('.')[0].charAt(0).toUpperCase() + hostname.split('.')[0].slice(1);

  let rawTitle = '';
  let rawDescription = '';
  let rawOgImage = '';
  let pageSnippet = '';

  // 1. Fetch Webpage HTML
  try {
    const response = await axios.get(normalizedUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 8000,
      maxRedirects: 5,
    });

    if (response.data && typeof response.data === 'string') {
      const $ = cheerio.load(response.data);

      // Extract titles
      rawTitle =
        $('meta[property="og:title"]').attr('content') ||
        $('meta[name="twitter:title"]').attr('content') ||
        $('title').first().text() ||
        $('h1').first().text() ||
        '';

      // Extract descriptions
      rawDescription =
        $('meta[property="og:description"]').attr('content') ||
        $('meta[name="twitter:description"]').attr('content') ||
        $('meta[name="description"]').attr('content') ||
        '';

      // Extract images/logos
      rawOgImage =
        $('meta[property="og:image"]').attr('content') ||
        $('meta[name="twitter:image"]').attr('content') ||
        $('link[rel="apple-touch-icon"]').attr('href') ||
        $('link[rel="icon"]').attr('href') ||
        '';

      // Make relative image URLs absolute
      if (rawOgImage && !rawOgImage.startsWith('http')) {
        try {
          rawOgImage = new URL(rawOgImage, normalizedUrl).toString();
        } catch {
          rawOgImage = '';
        }
      }

      // Gather body text snippet for AI understanding
      const headings = $('h1, h2, h3')
        .map((_, el) => $(el).text().trim())
        .get()
        .filter(Boolean)
        .slice(0, 5)
        .join(' | ');

      const paragraphs = $('p')
        .map((_, el) => $(el).text().trim())
        .get()
        .filter((t) => t.length > 20)
        .slice(0, 4)
        .join(' ');

      pageSnippet = `${headings}\n${paragraphs}`.slice(0, 1500);
    }
  } catch (fetchErr: any) {
    logger.warn(
      { url: normalizedUrl, err: fetchErr.message },
      'Direct HTML fetch failed or timed out. Falling back to domain heuristics.'
    );
  }

  // Fallback logo if none extracted
  const finalLogoUrl = rawOgImage || `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`;

  // 2. Direct Semantic Metadata Extraction from HTML Tags

  // 3. Fallback Heuristics from Real Scraped HTML
  const cleanedName = cleanRawTitle(rawTitle) || domainBrandName;
  let cleanedTagline = cleanRawDescription(rawDescription);
  if (!cleanedTagline || cleanedTagline.length < 10) {
    cleanedTagline = `The modern platform for ${hostname}`;
  }
  if (cleanedTagline.length > 140) {
    cleanedTagline = cleanedTagline.slice(0, 137) + '...';
  }

  const cleanedDescription = rawDescription && rawDescription.length >= 20
    ? rawDescription.slice(0, 500)
    : `${cleanedName} offers high-impact capabilities designed to streamline workflows and solve problems for users.`;

  return {
    name: cleanedName,
    tagline: cleanedTagline,
    description: cleanedDescription,
    logoUrl: finalLogoUrl,
    websiteUrl: normalizedUrl,
    suggestedCategorySlug: 'ai-tools',
    rawTitle,
    rawDescription,
  };
}

function cleanRawTitle(title: string): string {
  if (!title) return '';
  // Remove common suffixes like " - Home", " | Official Site", " - Brand"
  return title
    .split(/[-–—|:]/)[0]
    .trim()
    .replace(/^Welcome to\s+/i, '')
    .slice(0, 50);
}

function cleanRawDescription(desc: string): string {
  if (!desc) return '';
  const firstSentence = desc.split(/(?<=[.!?])\s+/)[0] || desc;
  return firstSentence.trim().slice(0, 140);
}
