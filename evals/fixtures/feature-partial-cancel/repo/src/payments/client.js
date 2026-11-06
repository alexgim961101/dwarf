// 결제 서비스 클라이언트. 환불 합계가 결제 금액을 넘으면 결제 서비스가 거절한다.
export function createPaymentsClient({ baseUrl, fetchImpl = fetch } = {}) {
  return {
    async refund(orderId, amount) {
      const res = await fetchImpl(`${baseUrl}/orders/${orderId}/refunds`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ amount }),
      });
      if (!res.ok) throw new Error(`refund rejected: ${res.status}`);
    },
  };
}
