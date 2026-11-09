import { withRetry } from '../lib/retry.js';

// 가격 서비스 클라이언트. SKU와 수량으로 결제 금액을 받는다. 프로모션·고객 등급 계산은 그쪽에 있다.
export function createPricingClient({ baseUrl, fetchImpl = fetch, timeoutMs = 2000 } = {}) {
  return {
    quote(sku, qty) {
      return withRetry(async () => {
        const url = `${baseUrl}/quotes?sku=${encodeURIComponent(sku)}&qty=${qty}`;
        const res = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) });
        if (!res.ok) throw Object.assign(new Error(`pricing ${res.status}`), { status: res.status });
        const { amount } = await res.json();
        return amount;
      });
    },
  };
}
