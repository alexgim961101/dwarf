// 재고 서비스 클라이언트.
export function createInventoryClient({ baseUrl, fetchImpl = fetch } = {}) {
  return {
    async release(sku, qty) {
      const res = await fetchImpl(`${baseUrl}/stock/${encodeURIComponent(sku)}/release`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ qty }),
      });
      if (!res.ok) throw new Error(`release failed: ${res.status}`);
    },
  };
}
