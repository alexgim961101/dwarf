import { isRemote } from '../shipping/zones.js';

const VAT_PERCENT = 10;
const FREE_SHIPPING_FROM = 50000;
const SHIPPING_FEE = 3000;
const REMOTE_SURCHARGE = 3000;

function couponDiscount(coupon, subtotal) {
  if (!coupon) return 0;
  if (coupon.minSubtotal && subtotal < coupon.minSubtotal) return 0;
  if (coupon.kind === 'amount') return Math.min(coupon.value, subtotal);
  const discount = Math.floor((subtotal * coupon.value) / 100);
  return coupon.maxDiscount ? Math.min(discount, coupon.maxDiscount) : discount;
}

// 장바구니 금액. freeShippingGap은 화면의 "무료배송까지 N원"에 쓴다.
export function cartTotals(items, { coupon = null, region } = {}) {
  const lines = [];
  for (const item of items) {
    if (item.qty < 0) throw new RangeError(`수량은 음수일 수 없다: ${item.sku}`);
    if (item.qty > 0) lines.push(item);
  }

  let subtotal = 0;
  let taxable = 0;
  for (const line of lines) {
    const amount = line.unitPrice * line.qty;
    subtotal += amount;
    if (line.taxClass === 'standard') taxable += amount;
  }

  const discount = couponDiscount(coupon, subtotal);
  const discounted = subtotal - discount;

  let shipping = 0;
  if (lines.length > 0) {
    shipping = subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE;
    if (isRemote(region)) shipping += REMOTE_SURCHARGE;
  }

  const taxableDiscount = subtotal === 0 ? 0 : Math.floor((discount * taxable) / subtotal);
  const tax = Math.round(((taxable - taxableDiscount) * VAT_PERCENT) / 100);

  return {
    subtotal,
    discount,
    shipping,
    tax,
    total: discounted + shipping + tax,
    freeShippingGap: Math.max(0, FREE_SHIPPING_FROM - subtotal),
  };
}
