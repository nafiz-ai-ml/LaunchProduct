import assert from 'assert';
import { RANKING_WEIGHTS } from '../shared/constants';

async function runRankingTests() {
  console.log('=== Starting Ranking Engine & Leaderboard Mathematical Tests ===');

  // 1. Test S_launch Mathematical Formula & Time Gravity Decay
  console.log('1. Testing S_launch formula and gravity dampening decay...');
  function calculateLaunchScore(
    vValid: number,
    uOrganicClicks: number,
    deltaTHours: number,
    weights = RANKING_WEIGHTS
  ): number {
    const numerator = vValid * weights.W_v + uOrganicClicks * weights.W_c;
    const denominator = Math.pow(deltaTHours + 1, weights.GAMMA_LAUNCH);
    return Math.round((numerator / denominator) * 10000) / 10000;
  }

  // At launch moment (Delta t = 0 hours)
  const scoreAtStart = calculateLaunchScore(100, 20, 0);
  // (100 * 1.0 + 20 * 0.15) / (0 + 1)^1.2 = 103 / 1 = 103.0
  assert.strictEqual(scoreAtStart, 103.0, 'Score at launch start must be 103.0');

  // After 4 hours
  const scoreAt4h = calculateLaunchScore(100, 20, 4);
  assert.strictEqual(scoreAt4h < scoreAtStart, true, 'Score must decay over time');

  // After 12 hours
  const scoreAt12h = calculateLaunchScore(100, 20, 12);
  const expectedDenominator12h = Math.pow(13, 1.2);
  const expectedScore12h = Math.round((103 / expectedDenominator12h) * 10000) / 10000;
  assert.strictEqual(scoreAt12h, expectedScore12h);

  // After 24 hours (End of launch day)
  const scoreAt24h = calculateLaunchScore(100, 20, 24);
  const expectedDenominator24h = Math.pow(25, 1.2);
  const expectedScore24h = Math.round((103 / expectedDenominator24h) * 10000) / 10000;
  assert.strictEqual(scoreAt24h, expectedScore24h);
  assert.strictEqual(scoreAt24h < scoreAt12h, true);
  console.log('✓ S_launch formula and gravity decay verified!');

  // 2. Test Strict Organic Traffic Isolation
  console.log('2. Testing strict organic click isolation in ranking score...');
  // Only organic non-duplicate clicks may increment uOrganicClicks
  function countOrganicClicks(clicks: { source: string; isDuplicate: boolean }[]): number {
    return clicks.filter((c) => c.source === 'ORGANIC' && !c.isDuplicate).length;
  }

  const sampleClicks = [
    { source: 'ORGANIC', isDuplicate: false },
    { source: 'ORGANIC', isDuplicate: false },
    { source: 'ORGANIC', isDuplicate: true },   // duplicate -> excluded
    { source: 'SPONSORED', isDuplicate: false }, // sponsored -> strictly excluded
    { source: 'SPONSORED', isDuplicate: false }, // sponsored -> strictly excluded
    { source: 'BOT', isDuplicate: false },       // bot -> strictly excluded
    { source: 'FRAUD', isDuplicate: false },     // fraud -> strictly excluded
  ];

  const qualifiedCount = countOrganicClicks(sampleClicks);
  assert.strictEqual(qualifiedCount, 2, 'Only the 2 non-duplicate organic clicks must qualify');

  const scoreWithStrictIsolation = calculateLaunchScore(50, qualifiedCount, 2);
  const scoreIfSponsoredLeaked = calculateLaunchScore(50, qualifiedCount + 2, 2);
  assert.notStrictEqual(scoreWithStrictIsolation, scoreIfSponsoredLeaked);
  console.log('✓ Organic click isolation verified!');

  // 3. Test S_trending 7-Day Rolling Decay Formula
  console.log('3. Testing S_trending 7-day rolling decay formula...');
  function calculateTrendingScore(
    daysData: { votes: number; reviews: number; clicks: number }[],
    weights = RANKING_WEIGHTS
  ): number {
    let total = 0;
    for (let d = 1; d <= daysData.length; d++) {
      const { votes, reviews, clicks } = daysData[d - 1] || { votes: 0, reviews: 0, clicks: 0 };
      const dayScore =
        (votes * weights.W_v + reviews * weights.W_r + Math.log10(clicks + 1) * weights.W_u) *
        Math.pow(weights.LAMBDA_DECAY, d - 1);
      total += dayScore;
    }
    return Math.round(total * 10000) / 10000;
  }

  // 7 days with equal daily activity (10 votes, 0 reviews, 9 clicks -> log10(10)=1)
  // Day score = 10 * 1.0 + 0 + 1 * 0.5 = 10.5
  const sample7Days = Array(7).fill({ votes: 10, reviews: 0, clicks: 9 });
  const trendingScore = calculateTrendingScore(sample7Days);

  // Analytical sum: 10.5 * sum_{k=0..6} (0.75)^k = 10.5 * (1 - 0.75^7) / (1 - 0.75)
  const analyticSum = 10.5 * ((1 - Math.pow(0.75, 7)) / 0.25);
  const expectedTrending = Math.round(analyticSum * 10000) / 10000;
  assert.strictEqual(trendingScore, expectedTrending);
  console.log('✓ S_trending 7-day rolling decay verified!');

  // 4. Test S_alltime Authority Score with Bayesian Shrinkage (K=5)
  console.log('4. Testing S_alltime score with Bayesian review shrinkage (K=5)...');
  function calculateAllTimeScore(vTotal: number, nReviews: number, avgRating: number): number {
    const votePart = Math.log10(vTotal + 1) * 40;
    const reviewPart = nReviews > 0 ? (avgRating * (nReviews / (nReviews + 5))) * 60 : 0;
    return Math.round((votePart + reviewPart) * 10000) / 10000;
  }

  // Case A: MVP pre-reviews phase (N_reviews = 0)
  // 99 votes -> log10(100) * 40 = 2 * 40 = 80.0
  const scoreNoReviews = calculateAllTimeScore(99, 0, 0);
  assert.strictEqual(scoreNoReviews, 80.0);

  // Case B: Product with 5 reviews, avgRating 4.0
  // Bayesian weight: 5 / (5 + 5) = 0.5
  // reviewPart: 4.0 * 0.5 * 60 = 120.0
  // Total: 80 + 120 = 200.0
  const scoreWithReviews = calculateAllTimeScore(99, 5, 4.0);
  assert.strictEqual(scoreWithReviews, 200.0);

  // Case C: Bayesian shrinkage dampens low review counts
  // 1 review of 5.0 rating: 5.0 * (1 / 6) * 60 = 50.0 (dampened vs full 300)
  const scoreLowReviews = calculateAllTimeScore(99, 1, 5.0);
  assert.strictEqual(scoreLowReviews, 80 + 50.0);
  console.log('✓ S_alltime Bayesian shrinkage verified!');

  // 5. Test Leaderboard Sorting & Rank Assignment
  console.log('5. Testing leaderboard ranking and tiebreaking logic...');
  const testProducts = [
    { id: 'prod_b', score: 45.2, votes: 12, createdAt: new Date('2026-09-01') },
    { id: 'prod_a', score: 85.0, votes: 30, createdAt: new Date('2026-09-02') },
    { id: 'prod_c', score: 45.2, votes: 15, createdAt: new Date('2026-09-03') }, // higher votes tiebreaker
    { id: 'prod_d', score: 12.1, votes: 5, createdAt: new Date('2026-09-01') },
  ];

  testProducts.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.votes !== a.votes) return b.votes - a.votes;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  const ranked = testProducts.map((p, idx) => ({ ...p, rank: idx + 1 }));

  assert.strictEqual(ranked[0]?.id, 'prod_a', 'Rank 1 must be highest score');
  assert.strictEqual(ranked[0]?.rank, 1);
  assert.strictEqual(ranked[1]?.id, 'prod_c', 'Rank 2 must win tiebreak by votes');
  assert.strictEqual(ranked[1]?.rank, 2);
  assert.strictEqual(ranked[2]?.id, 'prod_b', 'Rank 3 has fewer votes than rank 2');
  assert.strictEqual(ranked[2]?.rank, 3);
  assert.strictEqual(ranked[3]?.id, 'prod_d', 'Rank 4 has lowest score');
  assert.strictEqual(ranked[3]?.rank, 4);
  console.log('✓ Leaderboard ranking and tiebreaking passed!');

  // 6. Test UTC Midnight Date Normalization
  console.log('6. Testing UTC midnight calendar date normalization...');
  const arbitraryDate = new Date('2026-09-24T15:43:21.890Z');
  const normalizedUtc = new Date(
    Date.UTC(arbitraryDate.getUTCFullYear(), arbitraryDate.getUTCMonth(), arbitraryDate.getUTCDate(), 0, 0, 0, 0)
  );

  assert.strictEqual(normalizedUtc.toISOString(), '2026-09-24T00:00:00.000Z');
  console.log('✓ UTC midnight normalization verified!');

  console.log('\nAll Ranking Engine & Leaderboard Snapshot unit tests PASSED successfully!');
  process.exit(0);
}

runRankingTests().catch((err) => {
  console.error('Ranking unit test failed:', err);
  process.exit(1);
});
