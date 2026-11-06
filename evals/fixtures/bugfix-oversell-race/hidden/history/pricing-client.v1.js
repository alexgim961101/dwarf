// 로컬 가격표. SKU와 수량으로 결제 금액을 계산한다.
const table = { 'SKU-RED': 12000, 'SKU-BLUE': 15000, 'SKU-GREEN': 9000 };

export function createPricingClient() {
  return {
    quote(sku, qty) {
      if (!(sku in table)) throw new Error(`unknown sku: ${sku}`);
      return table[sku] * qty;
    },
  };
}
