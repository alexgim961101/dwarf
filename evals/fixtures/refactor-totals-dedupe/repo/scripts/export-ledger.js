// 시드 주문의 세금계산서를 원장 CSV로 찍는다. 운영은 월말 배치가 같은 형식으로 회계 시스템에 올린다.
// 사용: node scripts/export-ledger.js > ledger.csv
import { createApp } from '../src/app.js';
import { fixedClock } from '../src/lib/clock.js';
import { seed, SEED_TIME } from '../src/dev/seed.js';
import { ledgerCsv } from '../src/invoices/ledger.js';

const app = createApp({ clock: fixedClock(SEED_TIME) });
for (const order of await seed(app)) await app.invoices.build(order.id);
process.stdout.write(ledgerCsv(await app.invoices.list()));
