import { readFileSync } from 'node:fs';
import { unknownSku } from '../lib/errors.js';

// 상품 카탈로그. 단가는 공급가(부가세 별도)다. taxClass가 exempt면 면세(도서).
export function createCatalog(products) {
  const bySku = new Map(products.map((product) => [product.sku, Object.freeze({ ...product })]));
  return {
    get(sku) {
      const product = bySku.get(sku);
      if (!product) throw unknownSku(sku);
      return product;
    },
    all() {
      return [...bySku.values()];
    },
  };
}

export function loadCatalog(path = new URL('./products.json', import.meta.url)) {
  return createCatalog(JSON.parse(readFileSync(path, 'utf8')));
}
