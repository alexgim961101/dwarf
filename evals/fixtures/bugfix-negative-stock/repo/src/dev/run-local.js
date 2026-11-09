import { readFileSync } from 'node:fs';
import { createApp } from '../app.js';
import { createServer } from '../http/server.js';
import { createMemoryStockRepo } from '../inventory/stock-repo.js';
import { createLogger } from '../lib/logger.js';
import { createFakePricing, createFakeRefunds } from './fakes.js';

// 로컬 서버. 어젯밤 스냅샷으로 시작하고 외부 서비스는 가짜를 쓴다. 지연은 스테이징과 비슷하게.
const snapshot = JSON.parse(readFileSync(new URL('../../data/snapshots/latest.json', import.meta.url), 'utf8'));
const prices = Object.fromEntries(Object.keys(snapshot).map((sku, i) => [sku, 9000 + i * 2500]));

const app = createApp({
  repo: createMemoryStockRepo(snapshot, { latencyMs: 15 }),
  pricing: createFakePricing({ prices, delayMs: 60 }),
  refunds: createFakeRefunds({ delayMs: 60 }),
  logger: createLogger(),
});

const port = Number(process.env.PORT ?? 3000);
createServer(app).listen(port, () => app.logger.info('listening', { port }));
