import { invoiceTotals, lineBreakdown } from './totals.js';

// 세금계산서. 주문의 줄마다 공급가·할인·세액을 적는다.
export function createInvoices({ orders, clock, ids }) {
  const issued = [];

  return {
    async build(orderId) {
      const order = await orders.get(orderId);
      const totals = invoiceTotals(order.lines, { coupon: order.coupon, region: order.region });
      const invoice = {
        number: ids.next('INV'),
        kind: 'invoice',
        orderId: order.id,
        customer: order.customer,
        issuedOn: clock.today(),
        lines: lineBreakdown(order.lines, totals.discount),
        totals,
      };
      issued.push(invoice);
      return invoice;
    },
    async list() {
      return [...issued];
    },
  };
}
