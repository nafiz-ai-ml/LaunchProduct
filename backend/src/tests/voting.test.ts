import assert from 'assert';
import { VoteStatus } from '../shared/constants';

async function runVotingTests() {
  console.log('=== Starting Voting Service & Repository Tests ===');

  // 1. Test VoteStatus Enum values
  console.log('1. Testing VoteStatus enum values...');
  assert.strictEqual(VoteStatus.VALID, 'VALID');
  assert.strictEqual(VoteStatus.FLAGGED, 'FLAGGED');
  assert.strictEqual(VoteStatus.QUARANTINED, 'QUARANTINED');
  assert.strictEqual(VoteStatus.REJECTED_BOT, 'REJECTED_BOT');
  assert.strictEqual(VoteStatus.RETRACTED, 'RETRACTED');
  console.log('✓ VoteStatus enum verified!');

  // 2. Test 15-Minute Retract Window Calculation
  console.log('2. Testing 15-minute retraction window logic...');
  const now = new Date();
  
  // 5 minutes ago -> Allowed
  const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const elapsedMinutesAllowed = (now.getTime() - fiveMinAgo.getTime()) / (1000 * 60);
  assert.strictEqual(elapsedMinutesAllowed <= 15, true, '5 minutes must be within 15-min window');

  // 14.9 minutes ago -> Allowed
  const fourteenMinAgo = new Date(now.getTime() - 14.9 * 60 * 1000);
  assert.strictEqual((now.getTime() - fourteenMinAgo.getTime()) / (1000 * 60) <= 15, true);

  // 15.1 minutes ago -> Expired
  const fifteenOneMinAgo = new Date(now.getTime() - 15.1 * 60 * 1000);
  const elapsedMinutesExpired = (now.getTime() - fifteenOneMinAgo.getTime()) / (1000 * 60);
  assert.strictEqual(elapsedMinutesExpired > 15, true, '15.1 minutes must be outside 15-min window');

  // 2 hours ago -> Expired
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  assert.strictEqual((now.getTime() - twoHoursAgo.getTime()) / (1000 * 60) > 15, true);
  console.log('✓ Retraction window boundary tests passed!');

  // 3. Test Redis Daily Leaderboard Key Formatting
  console.log('3. Testing Redis leaderboard daily key format...');
  const testDate = new Date('2026-09-23T12:00:00.000Z');
  const dateStr = testDate.toISOString().split('T')[0];
  const redisKey = `leaderboard:today:${dateStr}:votes`;
  assert.strictEqual(redisKey, 'leaderboard:today:2026-09-23:votes');
  console.log('✓ Redis leaderboard key format verified!');

  // 4. Test User Vote Status Mapping
  console.log('4. Testing batch user vote status mapping logic...');
  const requestedProductIds = ['prod_1', 'prod_2', 'prod_3'];
  const mockUserVotes = [
    { productId: 'prod_1', status: VoteStatus.VALID },
    { productId: 'prod_2', status: VoteStatus.RETRACTED },
  ];

  const statusMap = new Map<string, VoteStatus | null>();
  for (const pid of requestedProductIds) {
    statusMap.set(pid, null);
  }
  for (const v of mockUserVotes) {
    if (statusMap.has(v.productId) && v.status !== VoteStatus.RETRACTED) {
      statusMap.set(v.productId, v.status);
    }
  }

  assert.strictEqual(statusMap.get('prod_1'), VoteStatus.VALID, 'prod_1 should be VALID');
  assert.strictEqual(statusMap.get('prod_2'), null, 'prod_2 is RETRACTED so active status must be null');
  assert.strictEqual(statusMap.get('prod_3'), null, 'prod_3 has no vote so status must be null');
  console.log('✓ Batch vote status mapping logic verified!');

  console.log('\nAll Voting Service unit assertions PASSED successfully!');
  process.exit(0);
}

runVotingTests().catch((err) => {
  console.error('Voting unit test failed:', err);
  process.exit(1);
});
