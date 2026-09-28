import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    directory_browse: {
      executor: 'constant-arrival-rate',
      rate: 50,
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: 50,
      maxVUs: 100,
      exec: 'directoryBrowse',
    },
    leaderboard_hotpath: {
      executor: 'constant-arrival-rate',
      rate: 10,
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: 10,
      maxVUs: 30,
      exec: 'leaderboardHotpath',
    },
    click_redirect: {
      executor: 'constant-arrival-rate',
      rate: 100,
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: 50,
      maxVUs: 150,
      exec: 'clickRedirect',
    },
  },
  thresholds: {
    'http_req_duration{scenario:directory_browse}': ['p(95)<150'],
    'http_req_duration{scenario:leaderboard_hotpath}': ['p(95)<150'],
    'http_req_duration{scenario:click_redirect}': ['p(95)<25'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:4000';

export function directoryBrowse() {
  const res = http.get(`${BASE_URL}/api/v1/products?limit=20`);
  check(res, {
    'directory status is 200': (r) => r.status === 200,
  });
}

export function leaderboardHotpath() {
  const res = http.get(`${BASE_URL}/api/v1/leaderboards`);
  check(res, {
    'leaderboard status is 200': (r) => r.status === 200,
  });
}

export function clickRedirect() {
  const res = http.get(`${BASE_URL}/api/v1/clicks/prod-sponsor-1?source=organic`, {
    redirects: 0,
  });
  check(res, {
    'click redirect status is 302 or 200': (r) => r.status === 302 || r.status === 200,
  });
}
