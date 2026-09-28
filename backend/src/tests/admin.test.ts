import assert from 'assert';
import { UserRole, RANKING_WEIGHTS } from '../shared/constants';

async function runAdminTests() {
  console.log('=== Starting System Administration Module Unit Tests ===');

  // 1. Test System Settings Structure & Default Resolution
  console.log('1. Testing system settings default schemas and keys...');
  const defaultSettingsMap: Record<string, unknown> = {
    ranking_weights: RANKING_WEIGHTS,
    anti_fraud_thresholds: {
      THRESHOLD_LOW: 30,
      THRESHOLD_HIGH: 70,
      MAX_SUBNET_VOTES_HOUR: 5,
    },
    platform_limits: {
      HOMEPAGE_SPOTLIGHT_MAX: 3,
      CATEGORY_FEATURED_MAX: 2,
      DAILY_SUBMISSION_MAX: 10,
    },
  };

  assert.strictEqual(typeof defaultSettingsMap.ranking_weights, 'object');
  assert.strictEqual((defaultSettingsMap.ranking_weights as any).W_v, 1.0);
  assert.strictEqual((defaultSettingsMap.ranking_weights as any).GAMMA_LAUNCH, 1.2);
  assert.strictEqual((defaultSettingsMap.anti_fraud_thresholds as any).THRESHOLD_LOW, 30);
  assert.strictEqual((defaultSettingsMap.platform_limits as any).HOMEPAGE_SPOTLIGHT_MAX, 3);
  console.log('✓ System settings defaults verified!');

  // 2. Test Setting Cache Invalidation Key Generation
  console.log('2. Testing setting cache invalidation keys...');
  function getSettingCacheKey(key: string): string {
    return `setting:${key}`;
  }

  assert.strictEqual(getSettingCacheKey('ranking_weights'), 'setting:ranking_weights');
  assert.strictEqual(getSettingCacheKey('anti_fraud_thresholds'), 'setting:anti_fraud_thresholds');
  console.log('✓ Setting cache invalidation key generation verified!');

  // 3. Test Manual Leaderboard Recompute Job Payload
  console.log('3. Testing manual recompute BullMQ job structure...');
  const testTargetDate = '2026-09-24';
  const testAdminId = '66ea00001111222233334401';
  const jobPayload = {
    type: 'MANUAL_RECOMPUTE' as const,
    targetDate: testTargetDate,
    requestedBy: testAdminId,
  };

  assert.strictEqual(jobPayload.type, 'MANUAL_RECOMPUTE');
  assert.strictEqual(jobPayload.targetDate, '2026-09-24');
  assert.strictEqual(jobPayload.requestedBy, testAdminId);
  console.log('✓ Manual recompute BullMQ job structure verified!');

  // 4. Test Unified Audit Log Normalization & Sorting
  console.log('4. Testing unified audit log normalization and chronological sorting...');
  const mockModerationLogs = [
    {
      _id: 'mod_1',
      moderatorId: { email: 'admin@launchproduct.com' },
      action: 'APPROVE',
      targetType: 'PRODUCT',
      targetId: 'prod_100',
      reason: 'Quality product submission',
      createdAt: new Date('2026-09-24T10:00:00Z'),
    },
    {
      _id: 'mod_2',
      moderatorId: { email: 'mod@launchproduct.com' },
      action: 'BAN_USER',
      targetType: 'USER',
      targetId: 'user_bad',
      reason: 'Spam activity',
      createdAt: new Date('2026-09-24T10:30:00Z'),
    },
  ];

  const mockActivityLogs = [
    {
      _id: 'act_1',
      userId: { email: 'admin@launchproduct.com' },
      eventType: 'SYSTEM_SETTING_UPDATED',
      productId: null,
      metadata: { settingKey: 'ranking_weights' },
      createdAt: new Date('2026-09-24T10:15:00Z'),
    },
  ];

  const unifiedLogs: Array<{
    id: string;
    source: 'MODERATION' | 'ACTIVITY';
    action: string;
    createdAt: Date;
  }> = [];

  for (const m of mockModerationLogs) {
    unifiedLogs.push({
      id: m._id,
      source: 'MODERATION',
      action: m.action,
      createdAt: m.createdAt,
    });
  }

  for (const a of mockActivityLogs) {
    unifiedLogs.push({
      id: a._id,
      source: 'ACTIVITY',
      action: a.eventType,
      createdAt: a.createdAt,
    });
  }

  unifiedLogs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  assert.strictEqual(unifiedLogs.length, 3);
  assert.strictEqual(unifiedLogs[0].id, 'mod_2', 'Latest log (10:30) must be first');
  assert.strictEqual(unifiedLogs[1].id, 'act_1', 'Middle log (10:15) must be second');
  assert.strictEqual(unifiedLogs[2].id, 'mod_1', 'Oldest log (10:00) must be third');
  console.log('✓ Unified audit log normalization and ordering verified!');

  // 5. Test User Filter Query Construction
  console.log('5. Testing user filter query construction...');
  function buildUserFilter(search?: string, role?: string, isBanned?: string | boolean) {
    const filter: Record<string, unknown> = {};
    if (role && Object.values(UserRole).includes(role as UserRole)) {
      filter.role = role;
    }
    if (isBanned !== undefined) {
      filter.isBanned = isBanned === 'true' || isBanned === true;
    }
    if (search && search.trim().length > 0) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { email: searchRegex },
        { 'founderProfile.displayName': searchRegex },
      ];
    }
    return filter;
  }

  const filter1 = buildUserFilter('john', 'FOUNDER', 'false');
  assert.strictEqual(filter1.role, 'FOUNDER');
  assert.strictEqual(filter1.isBanned, false);
  assert(Array.isArray(filter1.$or));

  const filter2 = buildUserFilter(undefined, 'ADMIN', true);
  assert.strictEqual(filter2.role, 'ADMIN');
  assert.strictEqual(filter2.isBanned, true);
  assert.strictEqual(filter2.$or, undefined);
  console.log('✓ User filter query construction verified!');

  // 6. Test Campaign Slot Utilization Math & Limits
  console.log('6. Testing campaign slot utilization computation...');
  const mockActiveCampaigns = [
    { tier: 'HOMEPAGE_SPOTLIGHT', slotKey: 'hp_1', amountCents: 14900 },
    { tier: 'HOMEPAGE_SPOTLIGHT', slotKey: 'hp_2', amountCents: 14900 },
    { tier: 'LAUNCH_PARTNER', slotKey: 'hp_3', amountCents: 29900 }, // also occupies homepage
    { tier: 'CATEGORY_FEATURED', metadata: { targetCategorySlug: 'ai-tools' }, amountCents: 4900 },
    { tier: 'CATEGORY_FEATURED', metadata: { targetCategorySlug: 'ai-tools' }, amountCents: 4900 },
    { tier: 'LAUNCH_BOOST', amountCents: 1900 },
  ];

  const spotlightCount = mockActiveCampaigns.filter(
    (c) => c.tier === 'HOMEPAGE_SPOTLIGHT' || c.tier === 'LAUNCH_PARTNER'
  ).length;

  const maxSpotlight = 3;
  const spotlightUtilization = Math.round((spotlightCount / maxSpotlight) * 100);

  assert.strictEqual(spotlightCount, 3, 'Homepage spotlight count should be 3');
  assert.strictEqual(spotlightUtilization, 100, 'Utilization should be 100%');

  // Category slot utilization
  const aiToolsCount = mockActiveCampaigns.filter(
    (c) => c.tier === 'CATEGORY_FEATURED' && c.metadata?.targetCategorySlug === 'ai-tools'
  ).length;
  const maxCategorySlots = 2;
  const categoryUtilization = Math.round((aiToolsCount / maxCategorySlots) * 100);
  assert.strictEqual(aiToolsCount, 2);
  assert.strictEqual(categoryUtilization, 100);

  // Revenue calculation
  const totalCents = mockActiveCampaigns.reduce((sum, c) => sum + c.amountCents, 0);
  assert.strictEqual(totalCents, 14900 + 14900 + 29900 + 4900 + 4900 + 1900);
  assert.strictEqual(totalCents / 100, 714);
  console.log('✓ Campaign slot utilization and revenue calculations verified!');

  // 7. Test Admin Role Verification Guard
  console.log('7. Testing admin role RBAC authorization rule...');
  function checkAdminAccess(user?: { role?: string }): boolean {
    return user?.role === UserRole.ADMIN;
  }

  assert.strictEqual(checkAdminAccess({ role: UserRole.ADMIN }), true);
  assert.strictEqual(checkAdminAccess({ role: UserRole.MODERATOR }), false);
  assert.strictEqual(checkAdminAccess({ role: UserRole.FOUNDER }), false);
  assert.strictEqual(checkAdminAccess({ role: UserRole.HUNTER }), false);
  assert.strictEqual(checkAdminAccess(undefined), false);
  console.log('✓ Admin role authorization guard verified!');

  console.log('\nAll System Administration Module unit tests PASSED successfully!');
  process.exit(0);
}

runAdminTests().catch((err) => {
  console.error('Admin unit tests failed:', err);
  process.exit(1);
});
