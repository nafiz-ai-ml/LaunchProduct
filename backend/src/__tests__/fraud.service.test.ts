import { hashTelemetry, DISPOSABLE_EMAIL_DOMAINS, KNOWN_DATACENTER_ASNS, antiFraudService } from '../services/fraud.service';

describe('AntiFraud Utilities Unit Tests', () => {
  it('computes deterministic HMAC-SHA256 telemetry hashes', () => {
    const hash1 = hashTelemetry('198.51.100.1:Mozilla/5.0');
    const hash2 = hashTelemetry('198.51.100.1:Mozilla/5.0');
    const hash3 = hashTelemetry('198.51.100.2:Mozilla/5.0');

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
    expect(hash1).not.toBe(hash3);
  });

  it('correctly detects disposable email domains', () => {
    expect(DISPOSABLE_EMAIL_DOMAINS.has('tempmail.com')).toBe(true);
    expect(DISPOSABLE_EMAIL_DOMAINS.has('mailinator.com')).toBe(true);
    expect(DISPOSABLE_EMAIL_DOMAINS.has('gmail.com')).toBe(false);
  });

  it('contains known datacenter ASNs', () => {
    expect(KNOWN_DATACENTER_ASNS.has(16509)).toBe(true); // AWS
    expect(KNOWN_DATACENTER_ASNS.has(15169)).toBe(true); // GCP
  });

  it('bypasses datacenter check for private/loopback IPs', async () => {
    const res = await antiFraudService.checkDatacenterIp('127.0.0.1');
    expect(res.isDatacenter).toBe(false);
  });
});
