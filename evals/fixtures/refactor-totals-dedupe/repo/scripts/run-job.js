// 배치 작업을 시드 주문으로 한 번 돌린다. 운영은 cron이 같은 명령을 부른다.
// 사용: node scripts/run-job.js reconcile
import { readFile } from 'node:fs/promises';
import { createApp } from '../src/app.js';
import { fixedClock } from '../src/lib/clock.js';
import { seed, SEED_TIME } from '../src/dev/seed.js';
import { runJob } from '../src/jobs/runner.js';

const name = process.argv[2];
if (!name) {
  console.error('사용: node scripts/run-job.js <작업 이름>');
  process.exit(2);
}

const config = JSON.parse(await readFile(new URL('../config/jobs.json', import.meta.url), 'utf8'));
const app = createApp({ clock: fixedClock(SEED_TIME) });
await seed(app);
console.log(JSON.stringify(await runJob(name, { app, config }), null, 2));
