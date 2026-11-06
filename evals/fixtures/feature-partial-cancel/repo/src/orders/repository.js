// 주문 저장소. 운영에서는 같은 인터페이스의 DB 어댑터를 쓴다.
export function createOrderRepository(orders = []) {
  const byId = new Map(orders.map((order) => [order.id, structuredClone(order)]));
  return {
    get(id) {
      return byId.get(id);
    },
    save(order) {
      byId.set(order.id, order);
      return order;
    },
  };
}
