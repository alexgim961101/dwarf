export const itemsTotal = (items) => items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);

// 결제 금액 = 상품 합계 - 주문 할인 + 배송비
export const paidAmount = (order) => itemsTotal(order.items) - order.discount + order.shippingFee;
