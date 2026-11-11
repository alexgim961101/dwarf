import { orderNotFound } from '../lib/errors.js';

// 주문 저장소의 메모리 구현. 운영 어댑터와 같은 비동기 인터페이스를 쓴다.
export function createMemoryOrderRepo() {
  const orders = new Map();
  return {
    async save(order) {
      orders.set(order.id, structuredClone(order));
    },
    async get(id) {
      const order = orders.get(id);
      if (!order) throw orderNotFound(id);
      return structuredClone(order);
    },
    async list() {
      return [...orders.values()].map((order) => structuredClone(order));
    },
  };
}
