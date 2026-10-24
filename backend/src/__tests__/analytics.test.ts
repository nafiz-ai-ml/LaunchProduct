import { hashTelemetry } from '../services/fraud.service';

const botUserAgentRegex =
  /bot|crawler|spider|crawling|googlebot|bingbot|yandex|duckduckbot|slurp|baiduspider|headless|phantomjs|mediapartners-google/i;

describe('Outbound Click Attribution & Analytics Tests', () => {
  it('correctly classifies bot vs legitimate user agents', () => {
    const testBots = [
      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'DuckDuckBot/1.0; (+http://duckduckgo.com/duckduckbot.html)',
      'PhantomJS/2.1.1 (Linux)',
    ];

    for (const bot of testBots) {
      expect(botUserAgentRegex.test(bot)).toBe(true);
    }

    const legitBrowsers = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6_1) AppleWebKit/605.1.15 Version/17.5 Safari/605.1.15',
    ];

    for (const browser of legitBrowsers) {
      expect(botUserAgentRegex.test(browser)).toBe(false);
    }
  });

  it('computes session hash for click deduplication', () => {
    const ip = '203.0.113.195';
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
    const hash1 = hashTelemetry(`${ip}:${ua}`);
    const hash2 = hashTelemetry(`${ip}:${ua}`);
    const hashDiff = hashTelemetry(`${ip}:OtherUA`);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
    expect(hash1).not.toBe(hashDiff);
  });

  it('correctly calculates click-through rates (CTR)', () => {
    function calculateCTR(impressions: number, organicClicks: number): number {
      const effectiveImpressions = Math.max(impressions, organicClicks);
      if (effectiveImpressions === 0) return 0;
      return Math.round((organicClicks / effectiveImpressions) * 10000) / 10000;
    }

    expect(calculateCTR(1000, 75)).toBe(0.075);
    expect(calculateCTR(48200, 3840)).toBe(0.0797);
    expect(calculateCTR(0, 0)).toBe(0);
    expect(calculateCTR(50, 100)).toBe(1.0); // Clamped
  });
});
