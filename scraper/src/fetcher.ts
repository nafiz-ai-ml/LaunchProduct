import dns from 'dns';
import http from 'http';
import https from 'https';
import axios, { AxiosResponse } from 'axios';
import ipaddr from 'ipaddr.js';

export class SsrfBlockedError extends Error {
  constructor(message: string = 'SSRF attempt blocked: Target IP is within a restricted network range') {
    super(message);
    this.name = 'SsrfBlockedError';
  }
}

export class ScraperDisallowedError extends Error {
  constructor(message: string = 'Scraping disallowed by robots.txt policy') {
    super(message);
    this.name = 'ScraperDisallowedError';
  }
}

// Blocked CIDR ranges specified by PRD and security specification
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
 * Checks whether an IP string matches any prohibited internal or cloud-metadata CIDRs
 */
export function isIpBlocked(ipStr: string): boolean {
  try {
    const addr = ipaddr.parse(ipStr);
    
    // Check CIDRs
    for (const cidr of BLOCKED_CIDRS) {
      if (addr.kind() === cidr[0].kind() && (addr as any).match(cidr)) {
        return true;
      }
    }

    // Additional check for private/loopback/linkLocal
    const range = addr.range();
    if (['loopback', 'private', 'linkLocal', 'carrierGradeNat'].includes(range)) {
      return true;
    }

    return false;
  } catch {
    // If IP fails to parse, reject defensively
    return true;
  }
}

/**
 * Validates protocol and resolves hostname against SSRF blocklist
 */
export async function validateSsrf(targetUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    throw new SsrfBlockedError(`Invalid URL structure: ${targetUrl}`);
  }

  // 1. Validate scheme (only http and https allowed)
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new SsrfBlockedError(
      `Prohibited URL scheme '${parsed.protocol}'. Only http:// and https:// are permitted.`
    );
  }

  const hostname = parsed.hostname;

  // Direct IP address check
  if (ipaddr.isValid(hostname)) {
    if (isIpBlocked(hostname)) {
      console.warn(`[SSRF ALERT] Direct connection attempt to blocked IP: ${hostname}`);
      throw new SsrfBlockedError(`Direct connection to blocked IP address '${hostname}' is rejected`);
    }
    return parsed;
  }

  // 2. Resolve DNS to verify all destination IPs
  try {
    const ips = await dns.promises.resolve4(hostname);
    if (!ips || ips.length === 0) {
      throw new SsrfBlockedError(`Unable to resolve IPv4 address for host: ${hostname}`);
    }

    for (const ip of ips) {
      if (isIpBlocked(ip)) {
        console.warn(`[SSRF ALERT] Domain '${hostname}' resolved to prohibited IP: ${ip}`);
        throw new SsrfBlockedError(`Host '${hostname}' resolved to prohibited IP range: ${ip}`);
      }
    }
  } catch (err: any) {
    if (err instanceof SsrfBlockedError) throw err;
    // Attempt IPv6 resolution fallback
    try {
      const ips6 = await dns.promises.resolve6(hostname);
      for (const ip6 of ips6) {
        if (isIpBlocked(ip6)) {
          console.warn(`[SSRF ALERT] Domain '${hostname}' resolved to prohibited IPv6: ${ip6}`);
          throw new SsrfBlockedError(`Host '${hostname}' resolved to prohibited IPv6 range: ${ip6}`);
        }
      }
    } catch {
      throw new Error(`DNS resolution failed for hostname '${hostname}': ${err.message}`);
    }
  }

  return parsed;
}

/**
 * Checks target website's /robots.txt policy
 */
async function checkRobotsTxt(parsedUrl: URL): Promise<void> {
  const robotsUrl = `${parsedUrl.origin}/robots.txt`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await axios.get(robotsUrl, {
      signal: controller.signal,
      timeout: 3000,
      validateStatus: () => true, // Don't throw on 404
      headers: {
        'User-Agent': 'LaunchProductBot/1.0 (+https://launchproduct.io/bot)',
      },
    });

    clearTimeout(timeoutId);

    if (response.status === 200 && typeof response.data === 'string') {
      const lines = response.data.split('\n');
      let appliesToBot = false;

      for (let rawLine of lines) {
        const line = rawLine.trim().toLowerCase();
        if (line.startsWith('#')) continue;

        if (line.startsWith('user-agent:')) {
          const ua = line.replace('user-agent:', '').trim();
          appliesToBot = ua === '*' || ua === 'launchproductbot';
        } else if (appliesToBot && line.startsWith('disallow:')) {
          const path = line.replace('disallow:', '').trim();
          if (path === '/' || path === '/*' || path === '') {
            if (path !== '') {
              throw new ScraperDisallowedError('Target website robots.txt disallows scraper indexing');
            }
          }
        }
      }
    }
  } catch (err) {
    if (err instanceof ScraperDisallowedError) throw err;
    // Ignore network timeouts or 404s for robots.txt
  }
}

/**
 * Main secureProductFetch implementation
 */
export async function secureProductFetch(initialUrl: string): Promise<string> {
  const MAX_REDIRECTS = 3;
  const MAX_BYTES = 2 * 1024 * 1024; // 2MB
  const TIMEOUT_MS = 5000; // 5000ms

  let currentUrl = initialUrl;
  let redirectCount = 0;

  // Validate initial URL
  let parsedUrl = await validateSsrf(currentUrl);

  // Check robots.txt first
  await checkRobotsTxt(parsedUrl);

  while (redirectCount <= MAX_REDIRECTS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response: AxiosResponse = await axios.get(currentUrl, {
        signal: controller.signal,
        timeout: TIMEOUT_MS,
        maxRedirects: 0, // Manual redirect handling for per-hop SSRF validation
        validateStatus: (status) => (status >= 200 && status < 400),
        headers: {
          'User-Agent': 'LaunchProductBot/1.0 (+https://launchproduct.io/bot)',
          'Accept': 'text/html, application/xhtml+xml',
        },
        responseType: 'text',
        transformResponse: [(data) => data], // Don't parse JSON
      });

      clearTimeout(timeoutId);

      // Handle Redirects (3xx)
      if (response.status >= 300 && response.status < 400) {
        redirectCount++;
        if (redirectCount > MAX_REDIRECTS) {
          throw new Error(`Exceeded maximum redirect limit of ${MAX_REDIRECTS} hops`);
        }

        const location = response.headers.location;
        if (!location) {
          throw new Error('Received redirect status with missing Location header');
        }

        // Resolve absolute URL
        const nextUrl = new URL(location, currentUrl).href;
        
        // Re-validate redirect target against SSRF blocklist
        await validateSsrf(nextUrl);
        currentUrl = nextUrl;
        continue;
      }

      // Check Content-Length header
      const contentLengthHeader = response.headers['content-length'];
      if (contentLengthHeader && parseInt(String(contentLengthHeader), 10) > MAX_BYTES) {
        throw new Error(`Content-Length (${contentLengthHeader} bytes) exceeds 2MB limit`);
      }

      const body = typeof response.data === 'string' ? response.data : String(response.data);
      if (Buffer.byteLength(body, 'utf8') > MAX_BYTES) {
        throw new Error('Response payload size exceeds 2MB limit');
      }

      return body;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'CanceledError' || err.code === 'ECONNABORTED') {
        throw new Error(`Scraper request timed out after ${TIMEOUT_MS}ms`);
      }
      throw err;
    }
  }

  throw new Error('Redirect loop or limit exceeded');
}

export default secureProductFetch;
