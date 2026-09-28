import dns from 'dns';
import axios from 'axios';
import * as cheerio from 'cheerio';
import ipaddr from 'ipaddr.js';
import { logger } from './logger';
import { UnprocessableError } from './errors';

export class SsrfBlockedError extends UnprocessableError {
  constructor(message: string = 'Target IP address is within a restricted network range') {
    super(message, 'SSRF_BLOCKED');
    this.name = 'SsrfBlockedError';
  }
}

// Prohibited internal and cloud metadata CIDR blocks
const BLOCKED_CIDRS = [
  ipaddr.parseCIDR('0.0.0.0/8'),
  ipaddr.parseCIDR('10.0.0.0/8'),
  ipaddr.parseCIDR('100.64.0.0/10'),
  ipaddr.parseCIDR('127.0.0.0/8'),
  ipaddr.parseCIDR('169.254.0.0/16'),
  ipaddr.parseCIDR('172.16.0.0/12'),
  ipaddr.parseCIDR('192.168.0.0/16'),
  ipaddr.parseCIDR('::1/128'),
  ipaddr.parseCIDR('fc00::/7'),
  ipaddr.parseCIDR('fe80::/10'),
];

/**
 * Checks if an IP string is within any private, loopback, or metadata CIDR block
 */
export function isIpBlocked(ipStr: string): boolean {
  try {
    const addr = ipaddr.parse(ipStr);
    for (const cidr of BLOCKED_CIDRS) {
      if (addr.kind() === cidr[0].kind() && (addr as any).match(cidr)) {
        return true;
      }
    }
    const range = addr.range();
    if (['loopback', 'private', 'linkLocal', 'carrierGradeNat'].includes(range)) {
      return true;
    }
    return false;
  } catch {
    return true;
  }
}

/**
 * Resolves DNS for hostname and checks if resolved IP is safe from SSRF
 */
export async function assertSafeHost(hostname: string): Promise<string> {
  const cleanHost = hostname.replace(/^\[|\]$/g, '').toLowerCase().trim();

  // If already an IP address, check directly
  if (ipaddr.isValid(cleanHost)) {
    if (isIpBlocked(cleanHost)) {
      throw new SsrfBlockedError(`Direct IP connection to ${cleanHost} is prohibited`);
    }
    return cleanHost;
  }

  try {
    const addresses = await dns.promises.resolve4(cleanHost);
    if (!addresses || addresses.length === 0) {
      throw new UnprocessableError(`Failed to resolve DNS for host: ${cleanHost}`, 'DNS_RESOLUTION_FAILED');
    }

    for (const ip of addresses) {
      if (isIpBlocked(ip)) {
        throw new SsrfBlockedError(`Resolved host ${cleanHost} points to prohibited IP: ${ip}`);
      }
    }

    return addresses[0];
  } catch (err: any) {
    if (err instanceof SsrfBlockedError) throw err;
    throw new UnprocessableError(`Unable to resolve host ${cleanHost}: ${err.message || 'DNS error'}`, 'DNS_RESOLUTION_FAILED');
  }
}

/**
 * Extracts normalized apex domain from domain or URL (e.g., 'https://app.example.com/page' -> 'example.com')
 */
export function extractApexDomain(input: string): string {
  if (!input) return '';
  let host = input.trim().toLowerCase();

  // Strip protocol
  host = host.replace(/^[a-zA-Z]+:\/\//, '');
  // Strip path/query/port
  host = host.split('/')[0].split('?')[0].split('#')[0].split(':')[0];
  // Strip leading www.
  host = host.replace(/^www\./, '');

  const parts = host.split('.');
  if (parts.length <= 2) {
    return host;
  }

  // Handle common two-part TLDs (e.g., .co.uk, .com.au, .org.uk)
  const secondLevelTlds = ['co.uk', 'org.uk', 'gov.uk', 'com.au', 'net.au', 'co.nz', 'co.jp'];
  const lastTwo = parts.slice(-2).join('.');
  if (secondLevelTlds.includes(lastTwo) && parts.length > 2) {
    return parts.slice(-3).join('.');
  }

  return parts.slice(-2).join('.');
}

/**
 * Resolves TXT records using Google DoH API with fallback to native Node.js DNS
 */
export async function resolveTxtRecords(domain: string): Promise<string[]> {
  const records: string[] = [];
  const cleanDomain = domain.toLowerCase().trim().replace(/^\.+|\.+$/g, '');
  const targetSubdomain = `_launchproduct.${cleanDomain}`;

  // 1. Query Google DoH for _launchproduct.{domain}
  try {
    const dohUrl = `https://dns.google/resolve?name=${encodeURIComponent(targetSubdomain)}&type=TXT`;
    const response = await axios.get(dohUrl, {
      timeout: 5000,
      headers: { Accept: 'application/dns-json' },
    });

    if (response.data && response.data.Answer && Array.isArray(response.data.Answer)) {
      for (const ans of response.data.Answer) {
        if (ans.data) {
          const cleaned = String(ans.data).replace(/^"|"$/g, '').trim();
          records.push(cleaned);
        }
      }
    }
  } catch (dohErr: any) {
    logger.warn({ dohErr: dohErr.message, targetSubdomain }, 'Google DoH query failed, trying native DNS');
  }

  // 2. Also query Google DoH for apex domain (in case founder added TXT directly to apex)
  if (records.length === 0) {
    try {
      const apexDohUrl = `https://dns.google/resolve?name=${encodeURIComponent(cleanDomain)}&type=TXT`;
      const apexRes = await axios.get(apexDohUrl, {
        timeout: 5000,
        headers: { Accept: 'application/dns-json' },
      });

      if (apexRes.data && apexRes.data.Answer && Array.isArray(apexRes.data.Answer)) {
        for (const ans of apexRes.data.Answer) {
          if (ans.data) {
            const cleaned = String(ans.data).replace(/^"|"$/g, '').trim();
            records.push(cleaned);
          }
        }
      }
    } catch {
      // Ignore apex DoH error
    }
  }

  // 3. Fallback to native Node.js dns.promises.resolveTxt
  if (records.length === 0) {
    try {
      const nativeRecords = await dns.promises.resolveTxt(targetSubdomain);
      for (const chunkGroup of nativeRecords) {
        records.push(chunkGroup.join(''));
      }
    } catch {
      // Subdomain not found in native DNS, check apex
    }
  }

  if (records.length === 0) {
    try {
      const apexNative = await dns.promises.resolveTxt(cleanDomain);
      for (const chunkGroup of apexNative) {
        records.push(chunkGroup.join(''));
      }
    } catch {
      // Apex not found in native DNS
    }
  }

  return records;
}

/**
 * SSRF-hardened fetch of homepage HTML to extract verification meta tag
 */
export async function fetchHomepageMetaTag(
  url: string,
  metaName: string = 'launchproduct-site-verification'
): Promise<string | null> {
  const normalizedUrl = url.startsWith('http://') || url.startsWith('https://')
    ? url
    : `https://${url}`;

  const parsedUrl = new URL(normalizedUrl);
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new UnprocessableError('Invalid URL protocol. Only HTTP and HTTPS are permitted.', 'INVALID_URL');
  }

  // Assert destination host is safe from SSRF
  await assertSafeHost(parsedUrl.hostname);

  try {
    const response = await axios.get(normalizedUrl, {
      timeout: 5000,
      maxContentLength: 2 * 1024 * 1024, // 2MB max
      maxBodyLength: 2 * 1024 * 1024,
      maxRedirects: 3,
      headers: {
        'User-Agent': 'LaunchProduct-Verifier/1.0 (+https://launchproduct.io/verify-bot)',
        Accept: 'text/html,application/xhtml+xml',
      },
      beforeRedirect: (options: any, { headers }: any) => {
        if (options.href) {
          const redirectUrl = new URL(options.href);
          if (!['http:', 'https:'].includes(redirectUrl.protocol)) {
            throw new SsrfBlockedError(`Redirect to protocol ${redirectUrl.protocol} blocked`);
          }
        }
      },
    });

    const html = typeof response.data === 'string' ? response.data : String(response.data);
    const $ = cheerio.load(html);

    // Check primary meta name
    let content = $(`meta[name="${metaName}"]`).attr('content');

    // Also check alternative 'launchproduct-verify' name
    if (!content) {
      content = $('meta[name="launchproduct-verify"]').attr('content');
    }

    if (content) {
      return content.trim();
    }

    // Heuristic regex fallback in case cheerio didn't match nested head tags
    const regex = new RegExp(
      `<meta\\s+[^>]*name=["'](?:${metaName}|launchproduct-verify)["'][^>]*content=["']([^"']+)["']`,
      'i'
    );
    const match = html.match(regex);
    if (match && match[1]) {
      return match[1].trim();
    }

    // Also match reversed attribute order: content="..." name="..."
    const reverseRegex = new RegExp(
      `<meta\\s+[^>]*content=["']([^"']+)["'][^>]*name=["'](?:${metaName}|launchproduct-verify)["']`,
      'i'
    );
    const reverseMatch = html.match(reverseRegex);
    if (reverseMatch && reverseMatch[1]) {
      return reverseMatch[1].trim();
    }

    return null;
  } catch (err: any) {
    if (err instanceof SsrfBlockedError) throw err;
    logger.warn({ err: err.message, url }, 'Failed to fetch homepage for HTML meta tag verification');
    return null;
  }
}
