import { readFileSync } from 'node:fs';
import { UnknownSku } from '../inventory/errors.js';

// 상품 카탈로그. backorderable이면 재고가 없어도 온라인 예약을 받고 입고 뒤 출고한다.
export function createCatalog(items) {
  const bySku = new Map(items.map((item) => [item.sku, Object.freeze({ ...item })]));
  return {
    get(sku) {
      const item = bySku.get(sku);
      if (!item) throw new UnknownSku(sku);
      return item;
    },
    has(sku) {
      return bySku.has(sku);
    },
    all() {
      return [...bySku.values()];
    },
  };
}

export function loadCatalog(path = new URL('./items.json', import.meta.url)) {
  return createCatalog(JSON.parse(readFileSync(path, 'utf8')));
}
