import { orderTotals } from './totals.js';

// 주문 접수와 조회. 상품과 쿠폰을 확인하고 금액을 계산해 저장한다.
export function createOrders({ catalog, coupons, repo, clock, ids }) {
  return {
    async place({ customer, items, couponCode, region }) {
      const lines = items.map(({ sku, qty }) => ({ ...catalog.get(sku), qty }));
      const coupon = couponCode ? coupons.get(couponCode) : null;
      const totals = orderTotals(lines, { coupon, region });
      const order = { id: ids.next('ORD'), customer, region, lines, coupon, totals, placedAt: clock.now() };
      await repo.save(order);
      return order;
    },
    get(id) {
      return repo.get(id);
    },
    list() {
      return repo.list();
    },
  };
}
