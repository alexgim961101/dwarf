import { createApp } from '../app.js';
import { createServer } from '../http/server.js';
import { formatWon } from '../lib/money.js';
import { seed } from './seed.js';

// 시드 주문을 넣고 로컬 서버를 띄운다.
const app = createApp();
for (const order of await seed(app)) {
  console.log(`${order.id} ${order.customer} ${formatWon(order.totals.total)}`);
}

const port = Number(process.env.PORT ?? 4731);
createServer(app).listen(port, () => console.log(`http://localhost:${port}`));
