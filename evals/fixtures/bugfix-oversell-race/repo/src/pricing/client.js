// 가격 서비스 클라이언트. SKU와 수량으로 결제 금액을 받는다.
export function createPricingClient({ baseUrl, fetchImpl = fetch } = {}) {
  return {
    async quote(sku, qty) {
      const res = await fetchImpl(`${baseUrl}/quotes?sku=${encodeURIComponent(sku)}&qty=${qty}`);
      if (!res.ok) throw new Error(`pricing ${res.status}`);
      const { amount } = await res.json();
      return amount;
    },
  };
}
