// 재고 저장소 인터페이스.
//   get(sku) → Promise<number>              없는 SKU는 0
//   adjust(sku, delta) → Promise<number>    더한 뒤의 값
//   set(sku, qty) → Promise<void>
//   entries() → Promise<[sku, qty][]>
// 운영은 같은 인터페이스의 Postgres 어댑터(stockroom-pg)를 쓴다.
// 아래는 개발·테스트용 메모리 구현. 실제 저장소처럼 호출마다 I/O 한 번을 기다린다.

const io = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function createMemoryStockRepo(initial = {}, { latencyMs = 1 } = {}) {
  const levels = new Map(Object.entries(initial));
  return {
    async get(sku) {
      await io(latencyMs);
      return levels.get(sku) ?? 0;
    },
    async adjust(sku, delta) {
      await io(latencyMs);
      const next = (levels.get(sku) ?? 0) + delta;
      levels.set(sku, next);
      return next;
    },
    async set(sku, qty) {
      await io(latencyMs);
      levels.set(sku, qty);
    },
    async entries() {
      await io(latencyMs);
      return [...levels.entries()];
    },
  };
}
