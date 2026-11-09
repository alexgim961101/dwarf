import { createApp } from '../app.js';
import { createServer } from '../http/server.js';
import { createMemoryStockRepo } from '../inventory/stock-repo.js';
import { createLogger } from '../lib/logger.js';
import { createFakePricing, createFakeRefunds } from './fakes.js';

// 로컬 서버. 외부 서비스는 가짜를 쓴다.
const levels = { 'TEE-BLK-M': 10, 'TEE-BLK-L': 10, 'TEE-WHT-M': 10, 'HOOD-GRY-L': 5, 'CAP-NVY': 20, 'SOCK-3P': 40, 'BAG-TOTE': 5 };
const prices = Object.fromEntries(Object.keys(levels).map((sku, i) => [sku, 9000 + i * 2500]));

const app = createApp({
  repo: createMemoryStockRepo(levels),
  pricing: createFakePricing({ prices }),
  refunds: createFakeRefunds(),
  logger: createLogger(),
});

const port = Number(process.env.PORT ?? 3000);
createServer(app).listen(port, () => app.logger.info('listening', { port }));
