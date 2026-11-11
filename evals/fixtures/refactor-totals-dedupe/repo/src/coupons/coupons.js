import { readFileSync } from 'node:fs';
import { unknownCoupon } from '../lib/errors.js';

// 쿠폰. kind가 percent면 value는 할인율(%), amount면 할인액(원).
// minSubtotal은 최소 주문액, maxDiscount는 정률 쿠폰의 최대 할인액.
export function createCoupons(coupons) {
  const byCode = new Map(coupons.map((coupon) => [coupon.code, Object.freeze({ ...coupon })]));
  return {
    get(code) {
      const coupon = byCode.get(code);
      if (!coupon) throw unknownCoupon(code);
      return coupon;
    },
  };
}

export function loadCoupons(path = new URL('./coupons.json', import.meta.url)) {
  return createCoupons(JSON.parse(readFileSync(path, 'utf8')));
}
