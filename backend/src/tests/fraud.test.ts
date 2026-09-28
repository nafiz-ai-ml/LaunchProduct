import assert from 'assert';
import {
  DISPOSABLE_EMAIL_DOMAINS,
  KNOWN_DATACENTER_ASNS,
  hashTelemetry,
  AntiFraudService,
} from '../services/fraud.service';
import {
  VoteStatus,
  THRESHOLD_LOW,
  THRESHOLD_HIGH,
  ANTI_FRAUD_WEIGHTS,
} from '../shared/constants';

async function runFraudEngineTests() {
  console.log('=== Starting Anti-Fraud Risk Engine Service Tests ===');

  const fraudService = new AntiFraudService();

  // 1. Test Disposable Email Detection
  console.log('1. Testing disposable email domain identification...');
  assert.strictEqual(DISPOSABLE_EMAIL_DOMAINS.has('tempmail.com'), true);
  assert.strictEqual(DISPOSABLE_EMAIL_DOMAINS.has('mailinator.com'), true);
  assert.strictEqual(DISPOSABLE_EMAIL_DOMAINS.has('guerrillamail.com'), true);
  assert.strictEqual(DISPOSABLE_EMAIL_DOMAINS.has('gmail.com'), false);
  assert.strictEqual(DISPOSABLE_EMAIL_DOMAINS.has('outlook.com'), false);
  assert.strictEqual(DISPOSABLE_EMAIL_DOMAINS.has('company.io'), false);
  console.log('✓ Disposable email domains identified accurately!');

  // 2. Test Datacenter ASNs
  console.log('2. Testing known datacenter ASN identification...');
  assert.strictEqual(KNOWN_DATACENTER_ASNS.has(16509), true, 'AWS ASN should be datacenter');
  assert.strictEqual(KNOWN_DATACENTER_ASNS.has(15169), true, 'GCP ASN should be datacenter');
  assert.strictEqual(KNOWN_DATACENTER_ASNS.has(14061), true, 'DigitalOcean ASN should be datacenter');
  assert.strictEqual(KNOWN_DATACENTER_ASNS.has(24940), true, 'Hetzner ASN should be datacenter');
  console.log('✓ Datacenter ASNs identified accurately!');

  // 3. Test Privacy Telemetry Hashing (HMAC-SHA256)
  console.log('3. Testing HMAC-SHA256 privacy hashing...');
  const ip1 = '198.51.100.25';
  const hash1 = hashTelemetry(ip1, 'test-secret');
  const hash2 = hashTelemetry(ip1, 'test-secret');
  const hash3 = hashTelemetry('198.51.100.26', 'test-secret');

  assert.strictEqual(hash1, hash2, 'Identical IP with same key must produce identical hash');
  assert.notStrictEqual(hash1, hash3, 'Different IPs must produce different hashes');
  assert.strictEqual(hash1.length, 64, 'HMAC-SHA256 output must be 64 characters');
  console.log('✓ Privacy hashing verified!');

  // 4. Test Dynamic Weights Fallback
  console.log('4. Testing signal weights resolution and fallback...');
  const weights = await fraudService.getSignalWeights();
  assert.strictEqual(weights.SIG_ACCOUNT_NEW, 20);
  assert.strictEqual(weights.SIG_IP_DATACENTER, 25);
  assert.strictEqual(weights.SIG_SUBNET_CONCENTRATION, 35);
  assert.strictEqual(weights.SIG_BURST_VELOCITY, 25);
  assert.strictEqual(weights.SIG_ZERO_PRIOR_ACTIVITY, 15);
  assert.strictEqual(weights.SIG_DEVICE_COLLISION, 40);
  assert.strictEqual(weights.SIG_HISTORICAL_TRUST, -20);
  console.log('✓ Dynamic signal weights resolution verified!');

  // 5. Test Risk Threshold Classifications
  console.log('5. Testing deterministic risk threshold classifications...');
  const classifyScore = (score: number): VoteStatus => {
    const clamped = Math.max(0, Math.min(100, Math.round(score)));
    if (clamped >= THRESHOLD_HIGH) return VoteStatus.QUARANTINED;
    if (clamped >= THRESHOLD_LOW) return VoteStatus.FLAGGED;
    return VoteStatus.VALID;
  };

  // VALID range (< 30)
  assert.strictEqual(classifyScore(0), VoteStatus.VALID);
  assert.strictEqual(classifyScore(15), VoteStatus.VALID);
  assert.strictEqual(classifyScore(20), VoteStatus.VALID);
  assert.strictEqual(classifyScore(29), VoteStatus.VALID);

  // FLAGGED range (30 <= score < 70)
  assert.strictEqual(classifyScore(30), VoteStatus.FLAGGED);
  assert.strictEqual(classifyScore(35), VoteStatus.FLAGGED);
  assert.strictEqual(classifyScore(50), VoteStatus.FLAGGED);
  assert.strictEqual(classifyScore(69), VoteStatus.FLAGGED);

  // QUARANTINED range (>= 70)
  assert.strictEqual(classifyScore(70), VoteStatus.QUARANTINED);
  assert.strictEqual(classifyScore(75), VoteStatus.QUARANTINED);
  assert.strictEqual(classifyScore(100), VoteStatus.QUARANTINED);
  assert.strictEqual(classifyScore(120), VoteStatus.QUARANTINED); // Over-clamped
  console.log('✓ Risk threshold boundary tests passed!');

  // 6. Test Multi-Signal Scoring Combinations
  console.log('6. Testing multi-signal additive scoring scenarios...');
  // Scenario A: Clean organic voter with 1 prior action (+0 signals)
  let scenarioA = 0;
  assert.strictEqual(classifyScore(scenarioA), VoteStatus.VALID);

  // Scenario B: New account (< 2h) only (+20) -> Score 20 -> VALID
  let scenarioB = ANTI_FRAUD_WEIGHTS.SIG_ACCOUNT_NEW;
  assert.strictEqual(scenarioB, 20);
  assert.strictEqual(classifyScore(scenarioB), VoteStatus.VALID);

  // Scenario C: New account (+20) + Zero Prior Activity (+15) -> Score 35 -> FLAGGED
  let scenarioC = ANTI_FRAUD_WEIGHTS.SIG_ACCOUNT_NEW + ANTI_FRAUD_WEIGHTS.SIG_ZERO_PRIOR_ACTIVITY;
  assert.strictEqual(scenarioC, 35);
  assert.strictEqual(classifyScore(scenarioC), VoteStatus.FLAGGED);

  // Scenario D: Subnet concentration (+35) + Burst velocity (+25) + Zero activity (+15) -> Score 75 -> QUARANTINED
  let scenarioD =
    ANTI_FRAUD_WEIGHTS.SIG_SUBNET_CONCENTRATION +
    ANTI_FRAUD_WEIGHTS.SIG_BURST_VELOCITY +
    ANTI_FRAUD_WEIGHTS.SIG_ZERO_PRIOR_ACTIVITY;
  assert.strictEqual(scenarioD, 75);
  assert.strictEqual(classifyScore(scenarioD), VoteStatus.QUARANTINED);

  // Scenario E: Device collision (+40) + Datacenter IP (+25) + New account (+20) -> Score 85 -> QUARANTINED
  let scenarioE =
    ANTI_FRAUD_WEIGHTS.SIG_DEVICE_COLLISION +
    ANTI_FRAUD_WEIGHTS.SIG_IP_DATACENTER +
    ANTI_FRAUD_WEIGHTS.SIG_ACCOUNT_NEW;
  assert.strictEqual(scenarioE, 85);
  assert.strictEqual(classifyScore(scenarioE), VoteStatus.QUARANTINED);

  // Scenario F: Subnet concentration (+35) with Historical Trust discount (-20) -> Score 15 -> VALID
  let scenarioF =
    ANTI_FRAUD_WEIGHTS.SIG_SUBNET_CONCENTRATION + ANTI_FRAUD_WEIGHTS.SIG_HISTORICAL_TRUST;
  assert.strictEqual(scenarioF, 15);
  assert.strictEqual(classifyScore(scenarioF), VoteStatus.VALID);

  console.log('✓ Multi-signal additive scenarios passed!');

  console.log('\nAll Anti-Fraud Risk Engine tests PASSED successfully!');
  process.exit(0);
}

runFraudEngineTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
