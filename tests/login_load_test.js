import http from 'k6/http';
import { check } from 'k6';
import { SharedArray } from 'k6/data';
import { Rate, Trend } from 'k6/metrics';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.1.0/index.js';

const loginFailRate = new Rate('login_fail_rate');
const loginDuration = new Trend('login_duration', true);

const users = new SharedArray('users', function () {
  const data = open('../data/users.csv')
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .slice(1);
  return data.map((line) => {
    const parts = line.split(',');
    return { username: parts[0].trim(), password: parts[1].trim() };
  });
});

export const options = {
  scenarios: {
    login_load_test: {
      executor: 'constant-arrival-rate',
      rate: 20,
      timeUnit: '1s',
      duration: '3m',
      preAllocatedVUs: 50,
      maxVUs: 100,
    },
  },

  thresholds: {
    http_req_duration: ['p(95)<1500'],
    http_req_failed: ['rate<0.03'],
  },
};

export default function () {
  const user = users[__VU % users.length];
  const url = 'https://fakestoreapi.com/auth/login';

  const payload = JSON.stringify({
    username: user.username,
    password: user.password,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: '60s',
    tags: { name: 'POST_auth_login' },
  };

  const res = http.post(url, payload, params);

  loginDuration.add(res.timings.duration);
  loginFailRate.add(res.status !== 200 && res.status !== 201);

  check(res, {
    'Login exitoso (status 2xx)': (r) => r.status >= 200 && r.status < 300,
    'Response contiene token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.token !== undefined && body.token !== null;
      } catch (e) {
        return false;
      }
    },
    'Tiempo de respuesta < 1500ms': (r) => r.timings.duration < 1500,
    'Response no vacío': (r) => r.body && r.body.length > 0,
  });
}

export function handleSummary(data) {
  return {
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
    './results/textSummary.txt': textSummary(data, { indent: ' ', enableColors: false }),
    './results/summary.json': JSON.stringify(data, null, 2),
  };
}
