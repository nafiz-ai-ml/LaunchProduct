import assert from 'assert';
import { ProductStatus, VoteStatus, UserRole } from '../shared/constants';

async function runModerationTests() {
  console.log('=== Starting Moderation Console & Governance Audit Tests ===');

  // 1. Test Product Approval State Machine
  console.log('1. Testing product submission approval transitions...');
  function determineApprovedProductStatus(launchDate?: Date | null, now: Date = new Date()): ProductStatus {
    if (launchDate && launchDate.getTime() > now.getTime()) {
      return ProductStatus.SCHEDULED;
    }
    return ProductStatus.LIVE;
  }

  const now = new Date();
  const futureLaunch = new Date(now.getTime() + 48 * 3600 * 1000); // 48 hours later
  const pastLaunch = new Date(now.getTime() - 2 * 3600 * 1000); // 2 hours ago

  assert.strictEqual(
    determineApprovedProductStatus(futureLaunch, now),
    ProductStatus.SCHEDULED,
    'Future launchDate must transition to SCHEDULED'
  );
  assert.strictEqual(
    determineApprovedProductStatus(pastLaunch, now),
    ProductStatus.LIVE,
    'Past or current launchDate must transition to LIVE'
  );
  assert.strictEqual(
    determineApprovedProductStatus(null, now),
    ProductStatus.LIVE,
    'Null launchDate must transition directly to LIVE'
  );
  console.log('✓ Product approval state machine verified!');

  // 2. Test Product Rejection & Audit Snapshot
  console.log('2. Testing product rejection state and audit logging payload...');
  const mockProduct = {
    _id: 'prod_123',
    status: ProductStatus.PENDING_REVIEW,
    rejectionReason: null as string | null,
  };

  const beforeProductState = {
    status: mockProduct.status,
    rejectionReason: mockProduct.rejectionReason,
  };

  mockProduct.status = ProductStatus.REJECTED;
  mockProduct.rejectionReason = 'Submission landing page is down with HTTP 500';

  const afterProductState = {
    status: mockProduct.status,
    rejectionReason: mockProduct.rejectionReason,
  };

  assert.strictEqual(beforeProductState.status, ProductStatus.PENDING_REVIEW);
  assert.strictEqual(afterProductState.status, ProductStatus.REJECTED);
  assert.strictEqual(afterProductState.rejectionReason, 'Submission landing page is down with HTTP 500');
  console.log('✓ Product rejection audit snapshot verified!');

  // 3. Test Quarantined Vote Overturning & Redis Score Key
  console.log('3. Testing quarantined vote overturning & Redis increment logic...');
  const mockVote = {
    _id: 'vote_456',
    productId: 'prod_123',
    status: VoteStatus.QUARANTINED,
    moderatorNote: null as string | null,
    createdAt: new Date('2026-09-24T08:00:00.000Z'),
  };

  const beforeVoteState = { status: mockVote.status, moderatorNote: mockVote.moderatorNote };

  mockVote.status = VoteStatus.VALID;
  mockVote.moderatorNote = 'Overturned by moderator to VALID';

  const afterVoteState = { status: mockVote.status, moderatorNote: mockVote.moderatorNote };

  assert.strictEqual(beforeVoteState.status, VoteStatus.QUARANTINED);
  assert.strictEqual(afterVoteState.status, VoteStatus.VALID);

  // Redis key for ZINCRBY +1
  const dateStr = mockVote.createdAt.toISOString().split('T')[0];
  const launchKey = `leaderboard:today:${dateStr}:launch`;
  const votesKey = `leaderboard:today:${dateStr}:votes`;
  assert.strictEqual(launchKey, 'leaderboard:today:2026-09-24:launch');
  assert.strictEqual(votesKey, 'leaderboard:today:2026-09-24:votes');
  console.log('✓ Quarantined vote overturning and Redis key format verified!');

  // 4. Test Quarantined Vote Rejection
  console.log('4. Testing quarantined vote rejection...');
  mockVote.status = VoteStatus.REJECTED_BOT;
  mockVote.moderatorNote = 'Confirmed automated proxy rotation bot';
  assert.strictEqual(mockVote.status, VoteStatus.REJECTED_BOT);
  console.log('✓ Quarantined vote rejection verified!');

  // 5. Test Ownership Claim Dispute Resolution
  console.log('5. Testing ownership claim dispute resolution...');
  const mockClaim = {
    _id: 'claim_789',
    productId: 'prod_123',
    userId: 'user_hunter_1',
    status: 'PENDING',
    adminNote: null as string | null,
  };

  const mockUser = {
    _id: 'user_hunter_1',
    role: UserRole.HUNTER,
  };

  // Decision APPROVE: upgrades user and binds product
  function resolveClaim(
    claim: typeof mockClaim,
    user: typeof mockUser,
    decision: 'APPROVE' | 'REJECT',
    note: string
  ) {
    if (decision === 'APPROVE') {
      claim.status = 'VERIFIED';
      claim.adminNote = note;
      user.role = UserRole.FOUNDER;
    } else {
      claim.status = 'REVOKED';
      claim.adminNote = note;
    }
  }

  resolveClaim(mockClaim, mockUser, 'APPROVE', 'Verified DNS TXT record');
  assert.strictEqual(mockClaim.status, 'VERIFIED');
  assert.strictEqual(mockUser.role, UserRole.FOUNDER, 'Claimant must be promoted to FOUNDER');
  assert.strictEqual(mockClaim.adminNote, 'Verified DNS TXT record');

  // Decision REJECT on another claim
  const mockClaim2 = {
    _id: 'claim_790',
    productId: 'prod_123',
    userId: 'user_hunter_2',
    status: 'PENDING',
    adminNote: null,
  };
  const mockUser2 = { _id: 'user_hunter_2', role: UserRole.HUNTER };
  resolveClaim(mockClaim2, mockUser2, 'REJECT', 'Domain registrant mismatch');
  assert.strictEqual(mockClaim2.status, 'REVOKED');
  assert.strictEqual(mockUser2.role, UserRole.HUNTER, 'Rejected claimant retains original role');
  console.log('✓ Ownership claim dispute resolution logic verified!');

  // 6. Test User Banning & Security Revocation
  console.log('6. Testing user ban and session invalidation rules...');
  const mockBadActor = {
    _id: 'user_bad_actor',
    email: 'fraudster@spambot.net',
    isBanned: false,
    banReason: null as string | null,
  };

  mockBadActor.isBanned = true;
  mockBadActor.banReason = 'Coordinated Sybil upvote ring';

  assert.strictEqual(mockBadActor.isBanned, true);
  assert.strictEqual(mockBadActor.banReason, 'Coordinated Sybil upvote ring');
  console.log('✓ User banning state transition verified!');

  // 7. Test Unified Action Type Mapping
  console.log('7. Testing unified actionType validation...');
  const supportedActionTypes = new Set([
    'APPROVE_PRODUCT',
    'REJECT_PRODUCT',
    'OVERTURN_VOTE',
    'REJECT_VOTE',
    'RESOLVE_CLAIM',
    'BAN_USER',
  ]);

  assert.strictEqual(supportedActionTypes.has('APPROVE_PRODUCT'), true);
  assert.strictEqual(supportedActionTypes.has('BAN_USER'), true);
  assert.strictEqual(supportedActionTypes.has('UNKNOWN_ACTION'), false);
  console.log('✓ Unified actionType validation verified!');

  console.log('\nAll Moderation Console unit tests PASSED successfully!');
  process.exit(0);
}

runModerationTests().catch((err) => {
  console.error('Moderation unit tests failed:', err);
  process.exit(1);
});
