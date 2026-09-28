import * as cheerio from 'cheerio';

export interface ScrapedMetadata {
  title: string;
  description: string;
  imageUrl: string;
  bodyText: string;
  canonicalDomain: string;
}

/**
 * Extracts OpenGraph and semantic HTML metadata from scraped page content
 */
export function extractMetadata(html: string, url: string): ScrapedMetadata {
  const $ = cheerio.load(html);

  // 1. Canonical domain derivation
  let canonicalDomain = '';
  try {
    const parsed = new URL(url);
    canonicalDomain = parsed.hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    canonicalDomain = url;
  }

  // 2. Title extraction: og:title -> twitter:title -> <title>
  const ogTitle =
    $('meta[property="og:title"]').attr('content') ||
    $('meta[name="og:title"]').attr('content') ||
    $('meta[name="twitter:title"]').attr('content');
  const tagTitle = $('title').text().trim();
  const title = (ogTitle || tagTitle || canonicalDomain).trim();

  // 3. Description extraction: og:description -> twitter:description -> meta[name="description"]
  const ogDesc =
    $('meta[property="og:description"]').attr('content') ||
    $('meta[name="og:description"]').attr('content') ||
    $('meta[name="twitter:description"]').attr('content');
  const metaDesc =
    $('meta[name="description"]').attr('content') ||
    $('meta[property="description"]').attr('content');
  const description = (ogDesc || metaDesc || '').trim();

  // 4. Image extraction: og:image -> twitter:image
  let imageUrl =
    $('meta[property="og:image"]').attr('content') ||
    $('meta[name="og:image"]').attr('content') ||
    $('meta[name="twitter:image"]').attr('content') ||
    '';

  if (imageUrl && !imageUrl.startsWith('http://') && !imageUrl.startsWith('https://') && !imageUrl.startsWith('data:')) {
    try {
      imageUrl = new URL(imageUrl, url).href;
    } catch {
      // Keep relative if resolution fails
    }
  }

  // 5. Clean text content extraction (strip scripts, styles, navigation, footer)
  $('script, style, nav, footer, noscript, svg, iframe, header').remove();
  const rawBody = $('body').text().replace(/\s+/g, ' ').trim();
  const bodyText = rawBody.substring(0, 2000);

  return {
    title,
    description,
    imageUrl,
    bodyText,
    canonicalDomain,
  };
}

export default extractMetadata;
