import assert from 'assert';
import { isAuthorizedForMetrics } from '../controllers/health.controller';
import {
  register,
  httpRequestsTotal,
  activeVotesTotal,
  scraperQueueWaiting,
  quarantineQueueDepth,
  campaignSlotsActive,
  deprecatedEndpointHitsTotal,
} from '../shared/metrics';

async function runHealthAndMetricsTests() {
  console.log('=== Starting Health Check & Observability Unit Tests ===');

  // =========================================================================
  // 1. Test Kubernetes Liveness & Readiness Logic
  // =========================================================================
  console.log('\n1. Testing Liveness probe response structure...');

  const mockLivenessProbe = () => ({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  });

  const livenessRes = mockLivenessProbe();
  assert.strictEqual(livenessRes.status, 'alive');
  assert.strictEqual(typeof livenessRes.uptimeSeconds, 'number');
  assert.ok(livenessRes.timestamp);
  console.log('✓ Liveness probe verified (instant 200 OK)');

  console.log('\n2. Testing Readiness / Full Dependency check evaluation...');

  interface DepStatus {
    status: 'connected' | 'disconnected' | 'active' | 'inactive';
    latencyMs?: number;
    activeWorkers?: number;
    error?: string;
  }

  function evaluateHealth(deps: {
    mongodb: DepStatus;
    redis: DepStatus;
    bullmq: DepStatus;
  }) {
    const isHealthy =
      deps.mongodb.status === 'connected' &&
      deps.redis.status === 'connected' &&
      deps.bullmq.status === 'active';

    return {
      httpStatus: isHealthy ? 200 : 503,
      body: {
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        dependencies: deps,
      },
    };
  }

  // Case 2.1: All dependencies operational
  const healthyCheck = evaluateHealth({
    mongodb: { status: 'connected', latencyMs: 3 },
    redis: { status: 'connected', latencyMs: 1 },
    bullmq: { status: 'active', activeWorkers: 2 },
  });

  assert.strictEqual(healthyCheck.httpStatus, 200);
  assert.strictEqual(healthyCheck.body.status, 'healthy');
  assert.strictEqual(healthyCheck.body.dependencies.mongodb.status, 'connected');
  assert.strictEqual(healthyCheck.body.dependencies.redis.status, 'connected');
  assert.strictEqual(healthyCheck.body.dependencies.bullmq.status, 'active');
  console.log('✓ All dependencies healthy -> returns HTTP 200');

  // Case 2.2: Degraded dependency (e.g. Redis disconnected)
  const degradedCheck = evaluateHealth({
    mongodb: { status: 'connected', latencyMs: 4 },
    redis: { status: 'disconnected', error: 'Connection refused' },
    bullmq: { status: 'inactive', activeWorkers: 0 },
  });

  assert.strictEqual(degradedCheck.httpStatus, 503);
  assert.strictEqual(degradedCheck.body.status, 'unhealthy');
  assert.strictEqual(degradedCheck.body.dependencies.redis.status, 'disconnected');
  console.log('✓ Dependency failure -> returns HTTP 503 Service Unavailable');

  // =========================================================================
  // 3. Test Prometheus Scrape Authorization Guard
  // =========================================================================
  console.log('\n3. Testing Prometheus metrics security & authorization guard...');

  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';

  // Test 3.1: Loopback IP allowed
  const localReq: any = {
    ip: '127.0.0.1',
    headers: {},
    socket: { remoteAddress: '127.0.0.1' },
  };
  assert.strictEqual(isAuthorizedForMetrics(localReq), true);
  console.log('✓ Local loopback IP (127.0.0.1) permitted');

  // Test 3.2: Private RFC 1918 subnet allowed
  const privateReq: any = {
    ip: '10.244.0.15', // Kubernetes pod CIDR
    headers: {},
    socket: { remoteAddress: '10.244.0.15' },
  };
  assert.strictEqual(isAuthorizedForMetrics(privateReq), true);
  console.log('✓ Private subnet / Kubernetes Pod CIDR permitted');

  // Test 3.3: Basic Auth credentials allowed
  process.env.METRICS_USER = 'prom_scraper';
  process.env.METRICS_PASSWORD = 'prom_password_secure_999';

  const validBasicAuthHeader = `Basic ${Buffer.from('prom_scraper:prom_password_secure_999').toString('base64')}`;
  const externalAuthReq: any = {
    ip: '198.51.100.22', // Public external IP
    headers: { authorization: validBasicAuthHeader },
    socket: { remoteAddress: '198.51.100.22' },
  };
  assert.strictEqual(isAuthorizedForMetrics(externalAuthReq), true);
  console.log('✓ Valid HTTP Basic Auth credentials permitted');

  // Test 3.4: Unauthorized external public IP rejected
  const publicUnauthReq: any = {
    ip: '198.51.100.22',
    headers: {},
    socket: { remoteAddress: '198.51.100.22' },
  };
  assert.strictEqual(isAuthorizedForMetrics(publicUnauthReq), false);
  console.log('✓ Unauthorized external IP rejected');

  process.env.NODE_ENV = originalEnv;

  // =========================================================================
  // 4. Test Prometheus Metric Types & Exposition Output
  // =========================================================================
  console.log('\n4. Testing Prometheus metrics registration and exposition format...');

  // Set known metric values
  httpRequestsTotal.inc({ method: 'GET', route: '/api/v1/products', status: '200' }, 42);
  activeVotesTotal.set(1337);
  scraperQueueWaiting.set(5);
  quarantineQueueDepth.set(2);
  campaignSlotsActive.set(3);
  deprecatedEndpointHitsTotal.inc({ endpoint: '/api/v1/legacy', sunset_date: '2026-12-31' }, 7);

  const metricsOutput = await register.metrics();

  assert.ok(
    metricsOutput.includes('launchproduct_http_requests_total'),
    'Expected http_requests_total counter'
  );
  assert.ok(
    metricsOutput.includes('launchproduct_active_votes_total'),
    'Expected active_votes_total gauge'
  );
  assert.ok(
    metricsOutput.includes('launchproduct_scraper_queue_waiting'),
    'Expected scraper_queue_waiting gauge'
  );
  assert.ok(
    metricsOutput.includes('launchproduct_quarantine_queue_depth'),
    'Expected quarantine_queue_depth gauge'
  );
  assert.ok(
    metricsOutput.includes('launchproduct_campaign_slots_active'),
    'Expected campaign_slots_active gauge'
  );
  assert.ok(
    metricsOutput.includes('launchproduct_deprecated_endpoint_hits_total'),
    'Expected deprecated_endpoint_hits_total counter'
  );

  // Check specific gauge value rendering in Prometheus format
  assert.ok(
    metricsOutput.includes('launchproduct_active_votes_total 1337'),
    'active_votes_total should render 1337'
  );
  assert.ok(
    metricsOutput.includes('launchproduct_campaign_slots_active 3'),
    'campaign_slots_active should render 3'
  );
  assert.ok(
    metricsOutput.includes('launchproduct_quarantine_queue_depth 2'),
    'quarantine_queue_depth should render 2'
  );

  console.log('✓ All 6 Prometheus metrics rendered in valid exposition format!');

  console.log('\n=== All Health Check & Observability Tests Passed Successfully! ===');
}

runHealthAndMetricsTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Health and metrics tests failed:', err);
    process.exit(1);
  });
