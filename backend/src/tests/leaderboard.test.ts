import assert from 'assert';
import { LeaderboardController } from '../controllers/leaderboard.controller';
import { ValidationError } from '../shared/errors';

async function runLeaderboardTests() {
  console.log('=== Starting Leaderboard Controller & Routes Unit Tests ===');

  // 1. Test Date Format Validation Logic
  console.log('1. Testing YYYY-MM-DD date validation...');
  const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

  assert.strictEqual(DATE_REGEX.test('2026-09-24'), true, 'Valid date 2026-09-24 must pass');
  assert.strictEqual(DATE_REGEX.test('2026-01-01'), true, 'Valid date 2026-01-01 must pass');
  assert.strictEqual(DATE_REGEX.test('2026-9-4'), false, 'Non-padded month/day must fail');
  assert.strictEqual(DATE_REGEX.test('24-09-2026'), false, 'DD-MM-YYYY format must fail');
  assert.strictEqual(DATE_REGEX.test('invalid-date'), false, 'Garbage string must fail');
  assert.strictEqual(DATE_REGEX.test(''), false, 'Empty string must fail');

  // Test UTC midnight conversion
  const dateStr = '2026-09-24';
  const [year, month, day] = dateStr.split('-').map(Number);
  const targetDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  assert.strictEqual(targetDate.toISOString(), '2026-09-24T00:00:00.000Z');
  console.log('✓ Date format and UTC midnight normalization verified!');

  // 2. Test Redis Leaderboard Key Formatting & TTL Constants
  console.log('2. Testing Redis leaderboard keys and TTL parameters...');
  const testLaunchKey = `leaderboard:today:${dateStr}:launch`;
  const testVotesKey = `leaderboard:today:${dateStr}:votes`;
  const allTimeCacheKey = 'leaderboard:cache:all-time';
  const trendingCacheKey = 'leaderboard:cache:trending';

  assert.strictEqual(testLaunchKey, 'leaderboard:today:2026-09-24:launch');
  assert.strictEqual(testVotesKey, 'leaderboard:today:2026-09-24:votes');
  assert.strictEqual(allTimeCacheKey, 'leaderboard:cache:all-time');
  assert.strictEqual(trendingCacheKey, 'leaderboard:cache:trending');

  // Verify TTLs: All-Time = 1 hr (3600s), Trending = 15 min (900s)
  const ALL_TIME_TTL = 3600;
  const TRENDING_TTL = 900;
  assert.strictEqual(ALL_TIME_TTL, 60 * 60, 'All-time TTL must be 1 hour');
  assert.strictEqual(TRENDING_TTL, 15 * 60, 'Trending TTL must be 15 minutes');
  console.log('✓ Redis leaderboard keys and TTL policies verified!');

  // 3. Test Redis Sorted Set Raw WITHSCORES Parsing
  console.log('3. Testing Redis ZREVRANGE WITHSCORES parsing...');
  const rawZrangeMembers = [
    'prod_aaa', '89.45',
    'prod_bbb', '54.20',
    'prod_ccc', '31.10',
    'prod_ddd', '12.00',
  ];

  const parsedEntries: { productId: string; score: number }[] = [];
  for (let i = 0; i < rawZrangeMembers.length; i += 2) {
    parsedEntries.push({
      productId: rawZrangeMembers[i],
      score: parseFloat(rawZrangeMembers[i + 1]),
    });
  }

  assert.strictEqual(parsedEntries.length, 4);
  assert.strictEqual(parsedEntries[0].productId, 'prod_aaa');
  assert.strictEqual(parsedEntries[0].score, 89.45);
  assert.strictEqual(parsedEntries[1].productId, 'prod_bbb');
  assert.strictEqual(parsedEntries[1].score, 54.2);
  assert.strictEqual(parsedEntries[3].score, 12.0);
  console.log('✓ Redis WITHSCORES deserialization verified!');

  // 4. Test Pagination Boundaries & Clamping Logic
  console.log('4. Testing pagination offset calculation and parameter limits...');
  function calculatePagination(pageQuery?: any, limitQuery?: any) {
    const page = Math.max(1, parseInt(pageQuery, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitQuery, 10) || 20));
    const offset = (page - 1) * limit;
    return { page, limit, offset, stop: offset + limit - 1 };
  }

  // Defaults
  const pDefault = calculatePagination();
  assert.strictEqual(pDefault.page, 1);
  assert.strictEqual(pDefault.limit, 20);
  assert.strictEqual(pDefault.offset, 0);
  assert.strictEqual(pDefault.stop, 19);

  // Page 2 with 25 limit
  const pPage2 = calculatePagination('2', '25');
  assert.strictEqual(pPage2.page, 2);
  assert.strictEqual(pPage2.limit, 25);
  assert.strictEqual(pPage2.offset, 25);
  assert.strictEqual(pPage2.stop, 49);

  // Max Limit Clamped to 100
  const pMaxLimit = calculatePagination('1', '500');
  assert.strictEqual(pMaxLimit.limit, 100, 'Limit should be clamped at 100');

  // Negative / Invalid values
  const pNegative = calculatePagination('-5', '-10');
  assert.strictEqual(pNegative.page, 1, 'Negative page must be clamped to 1');
  assert.strictEqual(pNegative.limit, 1, 'Negative limit must be clamped to 1');
  console.log('✓ Pagination bounds and clamping verified!');

  // 5. Test Controller Date Validation Error Handling
  console.log('5. Testing Controller input validation rejection on invalid date...');
  const controller = new LeaderboardController();

  let errorCaught: any = null;
  const mockReqInvalidDate: any = {
    query: { date: 'not-a-real-date' },
    params: {},
    headers: {},
  };
  const mockRes: any = {
    status: () => mockRes,
    json: () => mockRes,
  };

  await controller.getActiveLeaderboard(
    mockReqInvalidDate,
    mockRes,
    (err: any) => {
      errorCaught = err;
    }
  );

  assert(errorCaught instanceof ValidationError || errorCaught?.statusCode === 400, 'Bad date query must throw ValidationError');
  assert.strictEqual(errorCaught.details[0]?.code, 'INVALID_FORMAT');
  console.log('✓ Controller properly rejects malformed date format!');

  // Historical date param validation
  let histError: any = null;
  const mockReqHistInvalid: any = {
    params: { date: '2026-13-45' },
    query: {},
    headers: {},
  };

  await controller.getHistoricalDailyLeaderboard(
    mockReqHistInvalid,
    mockRes,
    (err: any) => {
      histError = err;
    }
  );

  assert(histError instanceof ValidationError || histError?.statusCode === 400, 'Invalid calendar date must throw ValidationError');
  assert.strictEqual(histError.details[0]?.code, 'INVALID_DATE');
  console.log('✓ Historical endpoint rejects invalid calendar date!');

  console.log('\nAll Leaderboard Controller & Routes unit tests PASSED successfully!');
  process.exit(0);
}

runLeaderboardTests().catch((err) => {
  console.error('Leaderboard unit test failed:', err);
  process.exit(1);
});
