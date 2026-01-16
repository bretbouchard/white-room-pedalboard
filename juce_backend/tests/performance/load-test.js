// tests/performance/load-test.js
import http from 'k6';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

export let errorRate = new Rate('errors');

export let options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp up to 10 users
    { duration: '5m', target: 10 }, // Stay at 10 users
    { duration: '2m', target: 20 }, // Ramp up to 20 users
    { duration: '5m', target: 20 }, // Stay at 20 users
    { duration: '2m', target: 0 },  // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    errors: ['rate<0.1'], // Error rate must be below 10%
  },
};

export default function() {
  // Test authentication
  let authResponse = http.post('http://localhost:8080/api/v1/auth/login', {
    email: 'test@example.com',
    password: 'testpassword'
  });

  check(authResponse, {
    'auth status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  let token = authResponse.json('token');
  let headers = { 'Authorization': `Bearer ${token}` };

  // Test composition creation (Schillinger)
  let compositionResponse = http.post('http://localhost:8080/api/v1/compositions',
    JSON.stringify({
      name: `Load Test Composition ${__VU}-${__ITER}`,
      tempo: 120,
      key: 'C',
      sections: []
    }),
    { headers: { ...headers, 'Content-Type': 'application/json' } }
  );

  check(compositionResponse, {
    'composition creation status is 201': (r) => r.status === 201,
  }) || errorRate.add(1);

  let compositionId = compositionResponse.json('id');

  // Test audio processing (Audio Agent via Schillinger)
  let audioResponse = http.post(`http://localhost:8080/api/v1/integration/process-with-audio/${compositionId}`,
    null,
    { headers }
  );

  check(audioResponse, {
    'audio processing status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(1);
}
