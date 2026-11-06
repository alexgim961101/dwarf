// 로컬 개발·테스트용 외부 서비스. 실제 결제 서비스처럼 결제 금액을 넘는 환불은 거절한다.
export function createFakePayments({ captured = {} } = {}) {
  const refunds = [];
  const refundedTotal = (orderId) =>
    refunds.filter((r) => r.orderId === orderId).reduce((sum, r) => sum + r.amount, 0);
  return {
    refunds,
    refundedTotal,
    async refund(orderId, amount) {
      if (!(amount > 0)) throw new Error(`invalid refund amount: ${amount}`);
      if (refundedTotal(orderId) + amount > (captured[orderId] ?? 0)) {
        throw new Error(`refund rejected: exceeds captured amount for ${orderId}`);
      }
      refunds.push({ orderId, amount });
    },
  };
}

export function createFakeInventory() {
  const released = [];
  return {
    released,
    async release(sku, qty) {
      released.push({ sku, qty });
    },
  };
}

export function createFakeNotifier() {
  const sent = [];
  return {
    sent,
    async send(customerId, template, data) {
      sent.push({ customerId, template, data });
    },
  };
}
