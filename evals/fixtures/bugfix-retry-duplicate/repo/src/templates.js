const templates = {
  'order.paid': (e) => `주문 ${e.orderId} 결제가 완료되었습니다.`,
  'order.shipped': (e) => `주문 ${e.orderId}이(가) 발송되었습니다.`,
  'order.cancelled': (e) => `주문 ${e.orderId}이(가) 취소되었습니다.`,
  'cart.reminder': (e) => `장바구니에 담아 둔 상품이 ${e.itemCount}개 있습니다.`,
};

export function render(type, event) {
  const template = templates[type];
  if (!template) throw new Error(`unknown template: ${type}`);
  return template(event);
}
