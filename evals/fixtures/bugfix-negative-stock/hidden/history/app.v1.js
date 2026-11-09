import { loadCatalog } from './catalog/catalog.js';
import { createMemoryStockRepo } from './inventory/stock-repo.js';
import { createReservations } from './inventory/reservations.js';
import { createRestock } from './inventory/restock.js';
import { dailyStockReport } from './reports/daily.js';
import { createClock } from './lib/clock.js';
import { silentLogger } from './lib/logger.js';

// 조립. 저장소·카탈로그·외부 클라이언트를 받아 서비스 객체를 만든다. 서버·스크립트·테스트가 모두 이걸 쓴다.
export function createApp({
  repo = createMemoryStockRepo(),
  catalog = loadCatalog(),
  pricing,
  refunds,
  clock = createClock(),
  logger = silentLogger,
} = {}) {
  const deps = { repo, catalog, pricing, refunds, clock, logger };
  return {
    repo,
    catalog,
    clock,
    logger,
    reservations: createReservations(deps),
    restock: createRestock(deps),
    reports: {
      daily: () => dailyStockReport(deps),
    },
  };
}
