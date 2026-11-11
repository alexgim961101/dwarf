// 주문에 저장된 금액과 세금계산서 금액을 맞춰 본다.
// 세금계산서는 세액을 줄마다 반올림하므로 주문 금액과 몇 원 다를 수 있고, 회계가 그 차이를 조정 전표로 올린다.
export async function reconcile({ app, invoiceTotals }) {
  const orders = await app.orders.list();
  const adjustments = [];
  for (const order of orders) {
    const invoice = invoiceTotals(order.lines, { coupon: order.coupon, region: order.region });
    const drift = invoice.total - order.totals.total;
    if (drift !== 0) {
      adjustments.push({ orderId: order.id, orderTotal: order.totals.total, invoiceTotal: invoice.total, drift });
    }
  }
  return { checked: orders.length, adjustments };
}
