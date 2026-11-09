import { withRetry } from '../lib/retry.js';

// 환불 서비스 클라이언트. 결제 수단으로 돌려준다.
export function createRefundClient({ baseUrl, fetchImpl = fetch, timeoutMs = 5000 } = {}) {
  return {
    issue(customerId, amount, meta = {}) {
      return withRetry(async () => {
        const res = await fetchImpl(`${baseUrl}/refunds`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ customerId, amount, ...meta }),
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (!res.ok) throw Object.assign(new Error(`refund ${res.status}`), { status: res.status });
      });
    },
  };
}
