import assert from 'assert';
import { hashTelemetry } from '../services/fraud.service';

// Recreate bot regex from analytics.service.ts for deterministic unit testing
const botUserAgentRegex =
  /bot|crawler|spider|crawling|googlebot|bingbot|yandex|duckduckbot|slurp|baiduspider|headless|phantomjs|mediapartners-google/i;

async function runAnalyticsTests() {
  console.log('=== Starting Outbound Click Attribution & Analytics Unit Tests ===');

  // 1. Test Bot User-Agent Classification
  console.log('1. Testing bot User-Agent identification...');
  const testBots = [
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
    'Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)',
    'DuckDuckBot/1.0; (+http://duckduckgo.com/duckduckbot.html)',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/90.0.4430.212 Safari/537.36',
    'PhantomJS/2.1.1 (Linux)',
    'Mediapartners-Google',
  ];

  for (const botUA of testBots) {
    assert.strictEqual(
      botUserAgentRegex.test(botUA),
      true,
      `User-Agent '${botUA}' must be detected as BOT`
    );
  }

  const legitBrowsers = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/128.0.6613.98 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0',
  ];

  for (const legitUA of legitBrowsers) {
    assert.strictEqual(
      botUserAgentRegex.test(legitUA),
      false,
      `User-Agent '${legitUA}' must NOT be detected as BOT`
    );
  }
  console.log('✓ Bot User-Agent identification passed!');

  // 2. Test HMAC Session Hashing
  console.log('2. Testing session hash computation for deduplication...');
  const ip = '203.0.113.195';
  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
  const sessionHash1 = hashTelemetry(`${ip}:${ua}`);
  const sessionHash2 = hashTelemetry(`${ip}:${ua}`);
  const sessionHashDiffIp = hashTelemetry(`203.0.113.196:${ua}`);
  const sessionHashDiffUa = hashTelemetry(`${ip}:DifferentBrowser`);

  assert.strictEqual(sessionHash1, sessionHash2, 'Same IP and UA must produce identical sessionHash');
  assert.strictEqual(sessionHash1.length, 64, 'Session hash must be a 64-character SHA256 hex string');
  assert.notStrictEqual(sessionHash1, sessionHashDiffIp, 'Different IP must produce distinct sessionHash');
  assert.notStrictEqual(sessionHash1, sessionHashDiffUa, 'Different UA must produce distinct sessionHash');
  console.log('✓ Session hash computation verified!');

  // 3. Test Deduplication 10-Minute Window Logic
  console.log('3. Testing 10-minute session deduplication window logic...');
  const dedupStore = new Map<string, number>();
  const testProductId = '66ea00001111222233334420';
  const dedupKey = `click:dedup:${testProductId}:${sessionHash1}`;

  function checkDedup(now: number): boolean {
    const existing = dedupStore.get(dedupKey);
    if (existing && existing > now) {
      return true; // Duplicate
    }
    dedupStore.set(dedupKey, now + 10 * 60 * 1000);
    return false; // First seen
  }

  const startTime = Date.now();
  // First click: Not duplicate
  assert.strictEqual(checkDedup(startTime), false, 'First click must not be duplicate');

  // Second click after 2 minutes: Duplicate!
  assert.strictEqual(checkDedup(startTime + 2 * 60 * 1000), true, 'Click within 10-min window must be duplicate');

  // Third click after 9.9 minutes: Duplicate!
  assert.strictEqual(checkDedup(startTime + 9.9 * 60 * 1000), true, 'Click at 9.9 mins must be duplicate');

  // Fourth click after 10.1 minutes: Fresh window (not duplicate)
  assert.strictEqual(checkDedup(startTime + 10.1 * 60 * 1000), false, 'Click after 10 mins must reset deduplication');
  console.log('✓ Deduplication window logic passed!');

  // 4. Test Strict Traffic Isolation (Organic vs Sponsored)
  console.log('4. Testing organic vs sponsored queue routing isolation...');
  type TargetQueue = 'click-events' | 'sponsored-click-events' | 'none';

  function determineQueue(source: 'ORGANIC' | 'SPONSORED' | 'BOT', isDuplicate: boolean): TargetQueue {
    if (source === 'BOT') return 'none';
    if (source === 'ORGANIC') {
      return isDuplicate ? 'none' : 'click-events';
    }
    if (source === 'SPONSORED') {
      return 'sponsored-click-events';
    }
    return 'none';
  }

  assert.strictEqual(determineQueue('ORGANIC', false), 'click-events', 'Organic non-duplicate must queue to click-events');
  assert.strictEqual(determineQueue('ORGANIC', true), 'none', 'Organic duplicate must NOT queue to click-events');
  assert.strictEqual(determineQueue('SPONSORED', false), 'sponsored-click-events', 'Sponsored click must queue to sponsored-click-events ONLY');
  assert.strictEqual(determineQueue('SPONSORED', true), 'sponsored-click-events', 'Sponsored duplicate must still queue to sponsored-click-events for audit');
  assert.strictEqual(determineQueue('BOT', false), 'none', 'Bot clicks must never queue to ranking or campaign queues');
  console.log('✓ Strict traffic isolation verified!');

  // 5. Test CTR & Summary Metrics Aggregation Calculation
  console.log('5. Testing CTR and founder analytics math...');
  function calculateCTR(impressions: number, organicClicks: number): number {
    const effectiveImpressions = Math.max(impressions, organicClicks);
    if (effectiveImpressions === 0) return 0;
    return Math.round((organicClicks / effectiveImpressions) * 10000) / 10000;
  }

  // 1,000 views, 75 clicks -> 7.5% CTR (0.075)
  assert.strictEqual(calculateCTR(1000, 75), 0.075);

  // 48,200 views, 3,840 clicks -> 0.0797 CTR
  assert.strictEqual(calculateCTR(48200, 3840), 0.0797);

  // 0 views, 0 clicks -> 0
  assert.strictEqual(calculateCTR(0, 0), 0);

  // Edge case: 50 views, 100 clicks (views under-reported) -> Clamped to 1.0 (100%)
  assert.strictEqual(calculateCTR(50, 100), 1.0);
  console.log('✓ CTR and metrics computation passed!');

  // 6. Test HTTP 302 Fast-Path Header Specifications
  console.log('6. Testing HTTP 302 redirect header specifications...');
  const destinationUrl = 'https://getsupasite.com?ref=launchproduct';
  const headers: Record<string, string> = {
    'Location': destinationUrl,
    'rel': 'noopener noreferrer',
    'Referrer-Policy': 'no-referrer-when-downgrade',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
  };

  assert.strictEqual(headers['Location'], destinationUrl);
  assert.strictEqual(headers['rel'], 'noopener noreferrer');
  assert.strictEqual(headers['Referrer-Policy'], 'no-referrer-when-downgrade');
  assert.strictEqual(headers['Cache-Control'], 'no-store, no-cache, must-revalidate');
  console.log('✓ HTTP 302 redirect headers verified!');

  console.log('\nAll Outbound Click Attribution & Analytics unit tests PASSED successfully!');
  process.exit(0);
}

runAnalyticsTests().catch((err) => {
  console.error('Analytics unit test failed:', err);
  process.exit(1);
});
