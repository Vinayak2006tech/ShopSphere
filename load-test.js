import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '15s', target: 20 },  // Ramp-up to 20 virtual users
    { duration: '30s', target: 50 },  // Steady load at 50 virtual users
    { duration: '15s', target: 0 },   // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<150'], // 95% of requests should be below 150ms
    http_req_failed: ['rate<0.01'],   // Error rate should be less than 1%
  },
};

const BASE_URL = __ENV.GATEWAY_URL || 'http://localhost:8080';

export default function () {
  // 1. Cluster Health check
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'gateway health status is 200': (r) => r.status === 200,
  });

  // 2. Product Catalog (tests Redis cache-aside)
  const productsRes = http.get(`${BASE_URL}/api/products`);
  check(productsRes, {
    'products endpoint status is 200': (r) => r.status === 200,
    'returns catalog array': (r) => JSON.parse(r.body).length > 0,
  });

  // 3. Typo-tolerant Search Service
  const searchRes = http.get(`${BASE_URL}/api/search?q=ceramic`);
  check(searchRes, {
    'search endpoint status is 200': (r) => r.status === 200,
  });

  // 4. Recommendation Engine (Python microservice)
  const recsRes = http.get(`${BASE_URL}/api/recommendations/product/prod_pottery_vase`);
  check(recsRes, {
    'recommendations status is 200': (r) => r.status === 200,
  });

  sleep(0.5);
}
