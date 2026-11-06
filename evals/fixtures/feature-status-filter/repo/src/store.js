// 메모리 저장소. 운영에서는 같은 인터페이스의 DB 어댑터를 쓴다.
export const STATUSES = ['pending', 'paid', 'shipped', 'cancelled', 'refunded'];

export function createStore(orders = []) {
  return {
    // 최신 주문부터
    list() {
      return [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
  };
}
