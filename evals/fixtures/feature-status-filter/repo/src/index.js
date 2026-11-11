import { createServer } from './server.js';
import { createStore } from './store.js';
import { seedOrders } from './seed.js';

const port = Number(process.env.PORT ?? 4733);
createServer(createStore(seedOrders)).listen(port, () => {
  console.log(`orders-api listening on ${port}`);
});
