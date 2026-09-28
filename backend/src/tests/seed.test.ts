import assert from 'assert';
import {
  SEED_CATEGORIES,
  SEED_SYSTEM_SETTINGS,
  SEED_USERS,
  seedDatabase,
} from '../shared/seed';
import { UserRole, ProductStatus } from '../shared/constants';

async function runSeedTests() {
  console.log('=== Starting Database Seeding Script Unit Tests ===');

  // =========================================================================
  // 1. MVP Categories Test
  // =========================================================================
  console.log('\n1. Testing 8 MVP Categories...');
  assert.strictEqual(SEED_CATEGORIES.length, 8, 'Must have exactly 8 MVP categories');

  const expectedCategories = [
    { slug: 'ai-tools', name: 'AI Tools', description: 'Artificial intelligence tools and assistants', sortOrder: 1 },
    { slug: 'ai-agents', name: 'AI Agents', description: 'Autonomous AI agent frameworks and platforms', sortOrder: 2 },
    { slug: 'saas', name: 'SaaS', description: 'Software as a Service applications', sortOrder: 3 },
    { slug: 'developer-tools', name: 'Developer Tools', description: 'Tools for software developers', sortOrder: 4 },
    { slug: 'productivity', name: 'Productivity', description: 'Productivity and workflow tools', sortOrder: 5 },
    { slug: 'marketing-tools', name: 'Marketing Tools', description: 'Marketing and growth tools', sortOrder: 6 },
    { slug: 'seo-tools', name: 'SEO Tools', description: 'SEO and content optimization tools', sortOrder: 7 },
    { slug: 'design-tools', name: 'Design Tools', description: 'Design and creative tools', sortOrder: 8 },
  ];

  for (let i = 0; i < expectedCategories.length; i++) {
    const expected = expectedCategories[i];
    const actual = SEED_CATEGORIES[i];
    assert.strictEqual(actual.slug, expected.slug, `Category ${i + 1} slug must be ${expected.slug}`);
    assert.strictEqual(actual.name, expected.name, `Category ${i + 1} name must be ${expected.name}`);
    assert.strictEqual(actual.description, expected.description, `Category ${i + 1} description must match`);
    assert.strictEqual(actual.sortOrder, expected.sortOrder, `Category ${i + 1} sortOrder must be ${expected.sortOrder}`);
  }
  console.log('✓ All 8 MVP categories verified in exact required order with 1-based sortOrder');

  // =========================================================================
  // 2. System Settings Test
  // =========================================================================
  console.log('\n2. Testing System Settings Default Configurations...');
  const settingsMap = new Map<string, any>();
  for (const s of SEED_SYSTEM_SETTINGS) {
    settingsMap.set(s.key, s.value);
  }

  // 2.1 antiFraudWeights
  const antiFraud = settingsMap.get('antiFraudWeights');
  assert.ok(antiFraud, 'antiFraudWeights must exist');
  assert.strictEqual(antiFraud.SIG_ACCOUNT_NEW, 20);
  assert.strictEqual(antiFraud.SIG_IP_DATACENTER, 25);
  assert.strictEqual(antiFraud.SIG_SUBNET_CONCENTRATION, 35);
  assert.strictEqual(antiFraud.SIG_BURST_VELOCITY, 25);
  assert.strictEqual(antiFraud.SIG_ZERO_PRIOR_ACTIVITY, 15);
  assert.strictEqual(antiFraud.SIG_DEVICE_COLLISION, 40);
  assert.strictEqual(antiFraud.SIG_HISTORICAL_TRUST, -20);
  assert.strictEqual(antiFraud.THRESHOLD_LOW, 30);
  assert.strictEqual(antiFraud.THRESHOLD_HIGH, 70);
  console.log('✓ antiFraudWeights values and threshold boundaries validated');

  // 2.2 rankingWeights
  const ranking = settingsMap.get('rankingWeights');
  assert.ok(ranking, 'rankingWeights must exist');
  assert.strictEqual(ranking.W_v, 1.0);
  assert.strictEqual(ranking.W_c, 0.15);
  assert.strictEqual(ranking.W_r, 2.5);
  assert.strictEqual(ranking.GAMMA_LAUNCH, 1.2);
  assert.strictEqual(ranking.LAMBDA_DECAY, 0.75);
  console.log('✓ rankingWeights formula coefficients validated');

  // 2.3 voteRetractWindowMinutes
  assert.strictEqual(settingsMap.get('voteRetractWindowMinutes'), 15, 'voteRetractWindowMinutes must be 15');
  console.log('✓ voteRetractWindowMinutes validated');

  // 2.4 minAccountAgeHours
  assert.strictEqual(settingsMap.get('minAccountAgeHours'), 2, 'minAccountAgeHours must be 2');
  console.log('✓ minAccountAgeHours validated');

  // 2.5 reviewMinAccountAgeDays
  assert.strictEqual(settingsMap.get('reviewMinAccountAgeDays'), 2, 'reviewMinAccountAgeDays must be 2');
  console.log('✓ reviewMinAccountAgeDays validated');

  // 2.6 campaignSlotLimits
  const campaignLimits = settingsMap.get('campaignSlotLimits');
  assert.ok(campaignLimits, 'campaignSlotLimits must exist');
  assert.strictEqual(campaignLimits.HOMEPAGE_SPOTLIGHT, 3);
  assert.strictEqual(campaignLimits.CATEGORY_FEATURED, 2);
  console.log('✓ campaignSlotLimits slot caps validated');

  // =========================================================================
  // 3. Admin & Founder Users Test
  // =========================================================================
  console.log('\n3. Testing Admin & Founder Users...');
  const adminUser = SEED_USERS.find((u) => u.email === 'admin@launchproduct.io');
  assert.ok(adminUser, 'Admin user admin@launchproduct.io must exist');
  assert.strictEqual(adminUser.role, UserRole.ADMIN, 'Admin user must have role ADMIN');
  assert.strictEqual(adminUser.isBanned, false, 'Admin user must not be banned');
  console.log('✓ Admin user verified');

  const founders = SEED_USERS.filter((u) => u.role === UserRole.FOUNDER);
  assert.ok(founders.length >= 3, 'Must seed founder users for sample products');
  for (const founder of founders) {
    assert.strictEqual(founder.isBanned, false);
    assert.ok(founder.founderProfile?.displayName, 'Founder must have displayName');
  }
  console.log(`✓ ${founders.length} founder profiles verified`);

  // =========================================================================
  // 4. Seeding Export Functions Test
  // =========================================================================
  console.log('\n4. Testing Seed Function Exports...');
  assert.strictEqual(typeof seedDatabase, 'function', 'seedDatabase must be an exported function');
  console.log('✓ seedDatabase function is properly exported');

  console.log('\n🎉 ALL DATABASE SEEDING UNIT TESTS PASSED SUCCESSFULLY! 🎉\n');
}

runSeedTests().catch((err) => {
  console.error('❌ Seed test failed:', err);
  process.exit(1);
});
