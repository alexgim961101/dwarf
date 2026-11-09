// 사용법: node scripts/daily-report.js [스냅샷.json]
// 스냅샷은 { "SKU": 수량 } 하나의 객체. 운영 배치가 매일 새벽 DB에서 같은 형식으로 뽑아 이 스크립트로 리포트를 만든다.
import { readFileSync } from 'node:fs';
import { createApp } from '../src/app.js';
import { createMemoryStockRepo } from '../src/inventory/stock-repo.js';

const path = process.argv[2] ?? new URL('../data/snapshots/latest.json', import.meta.url);
const snapshot = JSON.parse(readFileSync(path, 'utf8'));
const app = createApp({ repo: createMemoryStockRepo(snapshot) });
process.stdout.write(`${await app.reports.daily()}\n`);
