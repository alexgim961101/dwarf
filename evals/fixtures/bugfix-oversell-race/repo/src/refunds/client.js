// 환불 서비스 클라이언트.
export function createRefundClient({ baseUrl, fetchImpl = fetch } = {}) {
  return {
    async issue(customerId, amount) {
      const res = await fetchImpl(`${baseUrl}/refunds`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ customerId, amount }),
      });
      if (!res.ok) throw new Error(`refund ${res.status}`);
    },
  };
}
