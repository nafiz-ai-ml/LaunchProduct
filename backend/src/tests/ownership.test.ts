import assert from 'assert';
import crypto from 'crypto';
import { extractApexDomain, isIpBlocked } from '../shared/domain-verifier';

async function runTests() {
  console.log('=== Starting Ownership Verification Module Tests ===');

  // 1. Test extractApexDomain
  console.log('1. Testing extractApexDomain...');
  assert.strictEqual(extractApexDomain('https://www.example.com/path?foo=bar'), 'example.com');
  assert.strictEqual(extractApexDomain('http://subdomain.acme.ai/product'), 'acme.ai');
  assert.strictEqual(extractApexDomain('https://app.startup.co.uk/login'), 'startup.co.uk');
  assert.strictEqual(extractApexDomain('launchproduct.io'), 'launchproduct.io');
  console.log('✓ extractApexDomain tests passed!');

  // 2. Test SSRF isIpBlocked
  console.log('2. Testing SSRF IP validation (isIpBlocked)...');
  // Prohibited private & metadata ranges
  assert.strictEqual(isIpBlocked('127.0.0.1'), true, 'Loopback should be blocked');
  assert.strictEqual(isIpBlocked('169.254.169.254'), true, 'AWS/Cloud metadata should be blocked');
  assert.strictEqual(isIpBlocked('10.0.0.1'), true, '10.0.0.0/8 private network should be blocked');
  assert.strictEqual(isIpBlocked('192.168.1.1'), true, '192.168.0.0/16 private network should be blocked');
  assert.strictEqual(isIpBlocked('172.16.0.5'), true, '172.16.0.0/12 private network should be blocked');
  assert.strictEqual(isIpBlocked('::1'), true, 'IPv6 loopback should be blocked');
  assert.strictEqual(isIpBlocked('0.0.0.0'), true, '0.0.0.0/8 should be blocked');

  // Allowed public IPs
  assert.strictEqual(isIpBlocked('8.8.8.8'), false, 'Google DNS should be allowed');
  assert.strictEqual(isIpBlocked('1.1.1.1'), false, 'Cloudflare DNS should be allowed');
  assert.strictEqual(isIpBlocked('104.21.5.12'), false, 'Public Cloudflare IP should be allowed');
  console.log('✓ SSRF IP blocking tests passed!');

  // 3. Test Token generation & SHA-256 hash matching
  console.log('3. Testing Cryptographic Token & SHA-256 verification...');
  const rawToken = crypto.randomBytes(32).toString('hex');
  assert.strictEqual(rawToken.length, 64, 'Token must be 64 hex characters (32 bytes)');

  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  assert.strictEqual(tokenHash.length, 64, 'SHA-256 hash must be 64 hex characters');

  // Test matching
  const inputFromDns = `launchproduct-verify=${rawToken}`;
  const match = inputFromDns.match(/launchproduct-verify=([a-f0-9]+)/i);
  assert(match && match[1]);
  const candidateHash = crypto.createHash('sha256').update(match[1]).digest('hex');
  assert.strictEqual(candidateHash, tokenHash, 'Candidate hash must match stored tokenHash');

  // Test mismatch
  const tamperedToken = (rawToken[0] === 'a' ? 'b' : 'a') + rawToken.slice(1);
  const tamperedHash = crypto.createHash('sha256').update(tamperedToken).digest('hex');
  assert.notStrictEqual(tamperedHash, tokenHash, 'Tampered token must not match');
  console.log('✓ Token & SHA-256 cryptographic verification tests passed!');

  // 4. Test Meta Tag HTML regex parsing
  console.log('4. Testing HTML Meta Tag Extraction regex...');
  const sampleHtml1 = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Example App</title>
        <meta name="launchproduct-site-verification" content="${rawToken}">
      </head>
      <body><h1>Welcome</h1></body>
    </html>
  `;
  const regex1 = /<meta\s+[^>]*name=["'](?:launchproduct-site-verification|launchproduct-verify)["'][^>]*content=["']([^"']+)["']/i;
  const matchHtml1 = sampleHtml1.match(regex1);
  assert(matchHtml1 && matchHtml1[1] === rawToken, 'Failed to extract meta tag with standard attribute order');

  const sampleHtml2 = `
    <html>
      <head>
        <meta content="${rawToken}" name="launchproduct-site-verification" />
      </head>
    </html>
  `;
  const regex2 = /<meta\s+[^>]*content=["']([^"']+)["'][^>]*name=["'](?:launchproduct-site-verification|launchproduct-verify)["']/i;
  const matchHtml2 = sampleHtml2.match(regex2);
  assert(matchHtml2 && matchHtml2[1] === rawToken, 'Failed to extract meta tag with reversed attribute order');
  console.log('✓ HTML meta tag extraction regex tests passed!');

  console.log('\nAll Ownership Verification unit assertions PASSED successfully!');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
