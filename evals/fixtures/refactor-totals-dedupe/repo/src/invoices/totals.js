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

const roundHalfAway = (value) => Math.sign(value) * Math.round(Math.abs(value));

// 줄별 금액. 쿠폰 할인을 줄 금액 비율로 나누고 남는 원은 마지막 줄에 싣는다.
export function lineBreakdown(lines, discount) {
  let subtotal = 0;
  for (const line of lines) subtotal += line.unitPrice * line.qty;

  let rest = discount;
  return lines.map((line, index) => {
    const amount = line.unitPrice * line.qty;
    const isLast = index === lines.length - 1;
    const share = isLast ? rest : discount === 0 ? 0 : Math.floor((discount * amount) / subtotal);
    rest -= share;
    const tax = line.taxClass === 'standard' ? roundHalfAway(((amount - share) * VAT_PERCENT) / 100) : 0;
    return { ...line, amount, discount: share, tax };
  });
}

// 세금계산서 금액. 세액은 줄별 세액의 합이다.
export function invoiceTotals(lines, { coupon = null, region } = {}) {
  let subtotal = 0;
  for (const line of lines) subtotal += line.unitPrice * line.qty;

  const discount = couponDiscount(coupon, subtotal);
  const discounted = subtotal - discount;

  let shipping = 0;
  if (subtotal > 0) {
    shipping = discounted >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE;
    if (isRemote(region)) shipping += REMOTE_SURCHARGE;
  }

  let tax = 0;
  for (const line of lineBreakdown(lines, discount)) tax += line.tax;

  return { subtotal, discount, tax, shipping, total: discounted + shipping + tax };
}
