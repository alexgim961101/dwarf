import { newId } from '../lib/ids.js';
import { InvalidQuantity } from './errors.js';

// 입고. 납품서 단위로 재고를 더한다. 같은 납품서를 다시 보내면(재전송·동시 전송) 처음 결과를 돌려준다.
export function createRestock({ repo, catalog, clock, logger }) {
  const received = new Map(); // deliveryNoteId → Promise<record>

  return {
    receive(deliveryNoteId, lines) {
      if (received.has(deliveryNoteId)) return received.get(deliveryNoteId);
      const pending = (async () => {
        for (const { sku, qty } of lines) {
          catalog.get(sku);
          if (!Number.isInteger(qty) || qty <= 0) throw new InvalidQuantity(qty);
        }
        const results = [];
        for (const { sku, qty } of lines) results.push({ sku, qty, level: await repo.adjust(sku, qty) });
        const record = { id: newId('rcv'), deliveryNoteId, lines: results, receivedAt: clock.now().toISOString() };
        logger.info('restock.received', { deliveryNoteId, lines: results.length });
        return record;
      })();
      received.set(deliveryNoteId, pending);
      pending.catch(() => received.delete(deliveryNoteId));
      return pending;
    },
  };
}
