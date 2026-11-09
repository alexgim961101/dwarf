import { newId } from '../lib/ids.js';
import { InsufficientStock, InvalidQuantity, ReservationNotActive, ReservationNotFound } from './errors.js';

// 온라인 예약. 결제 전에 재고를 잡아 두고, 취소하면 환불하고 돌려놓는다. 확정하면 출고 대상이 된다.
export function createReservations({ repo, catalog, pricing, refunds, clock, logger }) {
  const reservations = new Map();

  return {
    async reserve(sku, qty, customerId) {
      const item = catalog.get(sku);
      if (!Number.isInteger(qty) || qty <= 0) throw new InvalidQuantity(qty);
      const available = await repo.get(sku);
      if (!item.backorderable && available < qty) throw new InsufficientStock(sku, available, qty);
      const price = await pricing.quote(sku, qty);
      await repo.adjust(sku, -qty);
      const reservation = {
        id: newId('rsv'),
        sku,
        qty,
        customerId,
        price,
        status: 'active',
        createdAt: clock.now().toISOString(),
      };
      reservations.set(reservation.id, reservation);
      logger.info('reservation.created', { id: reservation.id, sku, qty, backorder: available < qty });
      return reservation;
    },

    async cancel(id) {
      const reservation = reservations.get(id);
      if (!reservation) throw new ReservationNotFound(id);
      if (reservation.status !== 'active') return reservation;
      await refunds.issue(reservation.customerId, reservation.price, { reservationId: id });
      reservation.status = 'cancelled';
      await repo.adjust(reservation.sku, reservation.qty);
      logger.info('reservation.cancelled', { id, sku: reservation.sku, qty: reservation.qty });
      return reservation;
    },

    async confirm(id) {
      const reservation = reservations.get(id);
      if (!reservation) throw new ReservationNotFound(id);
      if (reservation.status !== 'active') throw new ReservationNotActive(id, reservation.status);
      reservation.status = 'confirmed';
      reservation.confirmedAt = clock.now().toISOString();
      logger.info('reservation.confirmed', { id });
      return reservation;
    },

    get(id) {
      return reservations.get(id);
    },

    list() {
      return [...reservations.values()];
    },
  };
}
