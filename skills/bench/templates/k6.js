// bench 서비스 모드 부하 스크립트 골격. <프로젝트>/.docs/perf/k6.js 로 복사해 채운다.
// 기준선과 사후에 같은 파일을 쓴다. 실행: k6 run --summary-export /out/summary.json /scripts/k6.js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    steady: {
      executor: 'constant-arrival-rate',
      rate: 50,              // 초당 요청. 운영 수준에 맞춘다
      timeUnit: '1s',
      duration: '60s',
      preAllocatedVUs: 20,
      maxVUs: 100,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],   // 오류를 센다. 거절은 빠르고 타임아웃은 느리다
    http_req_duration: ['p(95)<500'], // 목표치. perf playbook 1단계의 값
  },
};

export default function () {
  const res = http.get('http://app:8080/<경로>');
  check(res, {
    'status 200': (r) => r.status === 200,
    'body has data': (r) => r.body && r.body.length > 0, // 일이 실제로 일어났는지
  });
}
