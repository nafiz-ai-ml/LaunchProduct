import assert from 'assert';
import crypto from 'crypto';
import {
  SPONSORSHIP_PRICES_CENTS,
  SPONSORSHIP_DURATIONS_HOURS,
  SLOT_LIMITS,
  SLOT_RESERVATION_TTL_SECONDS,
  PaymentStatus,
} from '../shared/constants';
import {
  PaddleProvider,
  LemonSqueezyProvider,
  getPaymentProvider,
} from '../services/payment.service';
import { CampaignService } from '../services/campaign.service';

async function runCampaignTests() {
  console.log('=== Starting Campaign & Sponsorship Module Tests ===');

  const campaignService = new CampaignService();

  // 1. Test Sponsorship Tier Pricing and Durations
  console.log('1. Testing tier pricing and durations...');
  assert.strictEqual(SPONSORSHIP_PRICES_CENTS.LAUNCH_BOOST, 1900, 'Launch Boost must be $19 (1900 cents)');
  assert.strictEqual(SPONSORSHIP_PRICES_CENTS.CATEGORY_FEATURED, 4900, 'Category Featured must be $49 (4900 cents)');
  assert.strictEqual(SPONSORSHIP_PRICES_CENTS.HOMEPAGE_SPOTLIGHT, 14900, 'Homepage Spotlight must be $149 (14900 cents)');
  assert.strictEqual(SPONSORSHIP_PRICES_CENTS.LAUNCH_PARTNER, 29900, 'Launch Partner must be $299 (29900 cents)');

  assert.strictEqual(SPONSORSHIP_DURATIONS_HOURS.LAUNCH_BOOST, 48, 'Launch Boost duration must be 48 hours');
  assert.strictEqual(SPONSORSHIP_DURATIONS_HOURS.CATEGORY_FEATURED, 168, 'Category Featured must be 7 days (168 hours)');
  assert.strictEqual(SPONSORSHIP_DURATIONS_HOURS.HOMEPAGE_SPOTLIGHT, 24, 'Homepage Spotlight must be 24 hours');
  assert.strictEqual(SPONSORSHIP_DURATIONS_HOURS.LAUNCH_PARTNER, 168, 'Launch Partner must be 7 days (168 hours)');
  console.log('✓ Tier prices and durations verified!');

  // 2. Test Slot Limits and SlotKey Resolution
  console.log('2. Testing slot limits and slotKey derivation...');
  assert.strictEqual(SLOT_LIMITS.HOMEPAGE_SPOTLIGHT, 3, 'Homepage spotlight max slots must be 3');
  assert.strictEqual(SLOT_LIMITS.CATEGORY_FEATURED, 2, 'Category featured max slots must be 2');

  const heroSlot = campaignService.resolveSlotKey('HOMEPAGE_SPOTLIGHT');
  assert.strictEqual(heroSlot.slotKey, 'homepage:spotlight');
  assert.strictEqual(heroSlot.maxSlots, 3);

  const categorySlot = campaignService.resolveSlotKey('CATEGORY_FEATURED', 'Developer-Tools');
  assert.strictEqual(categorySlot.slotKey, 'category:developer-tools');
  assert.strictEqual(categorySlot.maxSlots, 2);

  const boostSlot = campaignService.resolveSlotKey('LAUNCH_BOOST');
  assert.strictEqual(boostSlot.slotKey, 'launch:boost');

  const partnerSlot = campaignService.resolveSlotKey('LAUNCH_PARTNER');
  assert.strictEqual(partnerSlot.slotKey, 'partner:bundle');
  assert.strictEqual(partnerSlot.maxSlots, 3);
  console.log('✓ Slot limits and slotKey derivations passed!');

  // 3. Test 15-Minute Reservation Expiry Boundary Logic
  console.log('3. Testing 15-minute reservation expiry boundary logic...');
  assert.strictEqual(SLOT_RESERVATION_TTL_SECONDS, 900, 'TTL must be 900 seconds (15 minutes)');

  const now = Date.now();
  function isReservationActive(createdAtMs: number): boolean {
    return now - createdAtMs < SLOT_RESERVATION_TTL_SECONDS * 1000;
  }

  // 5 minutes ago -> Active
  assert.strictEqual(isReservationActive(now - 5 * 60 * 1000), true);

  // 14.9 minutes ago -> Active
  assert.strictEqual(isReservationActive(now - 14.9 * 60 * 1000), true);

  // 15.1 minutes ago -> Expired
  assert.strictEqual(isReservationActive(now - 15.1 * 60 * 1000), false);

  // 60 minutes ago -> Expired
  assert.strictEqual(isReservationActive(now - 60 * 60 * 1000), false);
  console.log('✓ 15-minute reservation expiry logic passed!');

  // 4. Test Overlapping Date Range Detection
  console.log('4. Testing slot date range overlap detection...');
  function isOverlapping(s1: Date, e1: Date, s2: Date, e2: Date): boolean {
    return s1 < e2 && e1 > s2;
  }

  const baseStart = new Date('2026-09-25T00:00:00.000Z');
  const baseEnd = new Date('2026-09-26T00:00:00.000Z');

  // Exact same window -> Overlaps
  assert.strictEqual(isOverlapping(baseStart, baseEnd, baseStart, baseEnd), true);

  // Starts during window -> Overlaps
  assert.strictEqual(
    isOverlapping(baseStart, baseEnd, new Date('2026-09-25T12:00:00.000Z'), new Date('2026-09-27T00:00:00.000Z')),
    true
  );

  // Ends before window starts -> No overlap
  assert.strictEqual(
    isOverlapping(baseStart, baseEnd, new Date('2026-09-24T00:00:00.000Z'), new Date('2026-09-25T00:00:00.000Z')),
    false
  );

  // Starts after window ends -> No overlap
  assert.strictEqual(
    isOverlapping(baseStart, baseEnd, new Date('2026-09-26T00:00:00.000Z'), new Date('2026-09-27T00:00:00.000Z')),
    false
  );
  console.log('✓ Overlap calculation verified!');

  // 5. Test Payment Provider Factory & Checkout Generation
  console.log('5. Testing Payment Provider abstraction...');
  const paddle = getPaymentProvider('paddle');
  const lemonSqueezy = getPaymentProvider('lemonsqueezy');

  assert.strictEqual(paddle instanceof PaddleProvider, true);
  assert.strictEqual(lemonSqueezy instanceof LemonSqueezyProvider, true);

  const testParams = {
    tier: 'HOMEPAGE_SPOTLIGHT' as const,
    amountCents: 14900,
    campaignId: '66ea00001111222233334450',
    successUrl: 'https://launchproduct.io/dashboard/campaigns?success=true',
    cancelUrl: 'https://launchproduct.io/dashboard/campaigns?cancelled=true',
    founderEmail: 'founder@supasite.com',
    productName: 'Supasite',
  };

  const paddleSession = await paddle.createCheckoutSession(testParams);
  assert.strictEqual(paddleSession.checkoutUrl.includes('txn='), true);
  assert.strictEqual(paddleSession.checkoutUrl.includes('campaignId='), true);

  const lsSession = await lemonSqueezy.createCheckoutSession(testParams);
  assert.strictEqual(lsSession.checkoutUrl.includes('lemonsqueezy.com'), true);
  assert.strictEqual(lsSession.checkoutUrl.includes('66ea00001111222233334450'), true);
  console.log('✓ Checkout session generation verified!');

  // 6. Test Webhook Signature Verification
  console.log('6. Testing MoR webhook cryptographic signature verification...');
  const testSecret = 'secret_webhook_test_key_12345';
  const customPaddle = new PaddleProvider(testSecret);
  const customLS = new LemonSqueezyProvider(testSecret);

  const rawPayload = JSON.stringify({
    event_id: 'evt_test_1001',
    event_type: 'transaction.completed',
    data: {
      id: 'txn_001',
      custom_data: { campaignId: '66ea00001111222233334450' },
      details: { totals: { total: '149.00' } },
      currency_code: 'USD',
    },
  });

  // Test Paddle v2 timestamped signature
  const ts = Math.floor(Date.now() / 1000).toString();
  const paddleHash = crypto
    .createHmac('sha256', testSecret)
    .update(`${ts}:${rawPayload}`)
    .digest('hex');
  const validPaddleHeader = `ts=${ts};h1=${paddleHash}`;
  const invalidPaddleHeader = `ts=${ts};h1=invalid_hash_signature_0000000000000000000000000000000000000000000000000000000000000000`;

  assert.strictEqual(customPaddle.verifyWebhookSignature(rawPayload, validPaddleHeader), true);
  assert.strictEqual(customPaddle.verifyWebhookSignature(rawPayload, invalidPaddleHeader), false);

  // Test Lemon Squeezy signature
  const lsHash = crypto
    .createHmac('sha256', testSecret)
    .update(rawPayload)
    .digest('hex');
  assert.strictEqual(customLS.verifyWebhookSignature(rawPayload, lsHash), true);
  assert.strictEqual(customLS.verifyWebhookSignature(rawPayload, 'invalid_signature'), false);

  // Test event parsing
  const parsedEvent = customPaddle.parseWebhookEvent(rawPayload);
  assert.strictEqual(parsedEvent.campaignId, '66ea00001111222233334450');
  assert.strictEqual(parsedEvent.amountCents, 14900);
  assert.strictEqual(parsedEvent.status, PaymentStatus.SUCCEEDED);
  assert.strictEqual(parsedEvent.currency, 'USD');
  console.log('✓ Webhook cryptographic verification and event parsing passed!');

  console.log('\nAll Campaign & Monetization unit tests PASSED successfully!');
  process.exit(0);
}

runCampaignTests().catch((err) => {
  console.error('Campaign unit test failed:', err);
  process.exit(1);
});
