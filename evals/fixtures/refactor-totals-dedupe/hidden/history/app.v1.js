import { loadCatalog } from './catalog/catalog.js';
import { loadCoupons } from './coupons/coupons.js';
import { createCart } from './cart/cart.js';
import { createOrders } from './orders/orders.js';
import { createMemoryOrderRepo } from './orders/repository.js';
import { systemClock } from './lib/clock.js';
import { createIds } from './lib/ids.js';

// 조립. 서버·스크립트·테스트가 모두 이걸 쓴다.
export function createApp({
  catalog = loadCatalog(),
  coupons = loadCoupons(),
  repo = createMemoryOrderRepo(),
  clock = systemClock,
  ids = createIds(),
} = {}) {
  const cart = createCart({ catalog, coupons });
  const orders = createOrders({ catalog, coupons, repo, clock, ids });
  return { catalog, coupons, clock, cart, orders };
}
