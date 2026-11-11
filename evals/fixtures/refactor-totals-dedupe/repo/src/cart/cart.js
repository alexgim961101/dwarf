import { cartTotals } from './totals.js';

// 장바구니 금액 미리 보기. 저장하지 않는다.
// 수량을 0으로 내린 줄은 구매자가 지우기 전까지 화면에 남으므로 그대로 돌려준다.
export function createCart({ catalog, coupons }) {
  return {
    summarize({ items, couponCode, region }) {
      const rows = items.map(({ sku, qty }) => {
        const product = catalog.get(sku);
        return { ...product, qty, amount: product.unitPrice * qty };
      });
      const coupon = couponCode ? coupons.get(couponCode) : null;
      return { items: rows, totals: cartTotals(rows, { coupon, region }) };
    },
  };
}
