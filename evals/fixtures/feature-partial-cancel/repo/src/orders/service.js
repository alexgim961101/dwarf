import { paidAmount } from './pricing.js';
import { OrderNotCancellable, OrderNotFound } from './errors.js';

export function createOrderService({ orders, payments, inventory, notifier }) {
  return {
    // 주문 전체 취소. 결제 완료 상태에서만. 결제 금액 전부 환불, 재고 복구, 고객 알림.
    async cancelOrder(orderId) {
      const order = orders.get(orderId);
      if (!order) throw new OrderNotFound(orderId);
      if (order.status !== 'paid') throw new OrderNotCancellable(orderId, order.status);
      await payments.refund(orderId, paidAmount(order));
      for (const item of order.items) await inventory.release(item.sku, item.qty);
      order.status = 'cancelled';
      orders.save(order);
      await notifier.send(order.customerId, 'order.cancelled', { orderId });
      return order;
    },
  };
}
