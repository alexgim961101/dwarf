import { invalidQuantity, unknownSku } from '../lib/errors.js';
import { invoiceTotals, lineBreakdown } from './totals.js';

// 세금계산서와 반품 전표. 반품 전표는 수량이 음수인 줄로 낸다.
export function createInvoices({ orders, clock, ids }) {
  const issued = [];

  function issue(kind, order, lines, coupon) {
    const totals = invoiceTotals(lines, { coupon, region: order.region });
    const invoice = {
      number: ids.next(kind === 'credit' ? 'CN' : 'INV'),
      kind,
      orderId: order.id,
      customer: order.customer,
      issuedOn: clock.today(),
      lines: lineBreakdown(lines, totals.discount),
      totals,
    };
    issued.push(invoice);
    return invoice;
  }

  return {
    async build(orderId) {
      const order = await orders.get(orderId);
      return issue('invoice', order, order.lines, order.coupon);
    },
    // returns: [{ sku, qty }]. 쿠폰 할인분은 돌려주지 않는다.
    async credit(orderId, returns) {
      const order = await orders.get(orderId);
      const lines = returns.map(({ sku, qty }) => {
        const line = order.lines.find((candidate) => candidate.sku === sku);
        if (!line) throw unknownSku(sku);
        if (!Number.isInteger(qty) || qty <= 0 || qty > line.qty) throw invalidQuantity(sku);
        return { ...line, qty: -qty };
      });
      return issue('credit', order, lines, null);
    },
    async list() {
      return [...issued];
    },
  };
}
