import { newId } from '../lib/ids.js';
import { InsufficientStock, InvalidQuantity, SaleNotFound } from '../inventory/errors.js';

// 매장 POS 판매. 손님이 들고 온 물건을 계산하면 재고에서 뺀다.
// 예약 주문 상품도 매장에서는 실물이 있어야 팔 수 있다.
export function createSales({ repo, catalog, clock, logger }) {
  const sales = new Map();

  return {
    async recordSale(sku, qty, registerId) {
      catalog.get(sku);
      if (!Number.isInteger(qty) || qty <= 0) throw new InvalidQuantity(qty);
      const available = await repo.get(sku);
      if (available < qty) throw new InsufficientStock(sku, available, qty);
      await repo.adjust(sku, -qty);
      const sale = { id: newId('sale'), sku, qty, registerId, status: 'sold', soldAt: clock.now().toISOString() };
      sales.set(sale.id, sale);
      logger.info('sale.recorded', { id: sale.id, sku, qty, registerId });
      return sale;
    },

    async voidSale(id) {
      const sale = sales.get(id);
      if (!sale) throw new SaleNotFound(id);
      if (sale.status === 'voided') return sale;
      sale.status = 'voided';
      sale.voidedAt = clock.now().toISOString();
      await repo.adjust(sale.sku, sale.qty);
      logger.info('sale.voided', { id, sku: sale.sku, qty: sale.qty });
      return sale;
    },

    list(registerId) {
      const all = [...sales.values()];
      return registerId ? all.filter((s) => s.registerId === registerId) : all;
    },
  };
}
