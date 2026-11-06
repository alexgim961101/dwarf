import { randomUUID } from 'node:crypto';
import { InsufficientStock, ReservationNotFound } from './errors.js';

// 재고 예약. 예약하면 재고를 잡아 두고, 취소하면 환불하고 돌려놓는다.
export function createReservations({ stock, pricing, refunds }) {
  const reservations = new Map();

  return {
    async reserve(sku, qty, customerId) {
      const available = stock.get(sku);
      if (available < qty) throw new InsufficientStock(sku, available, qty);
      const price = pricing.quote(sku, qty);
      stock.adjust(sku, -qty);
      const reservation = { id: randomUUID(), sku, qty, customerId, price, status: 'active' };
      reservations.set(reservation.id, reservation);
      return reservation;
    },

    async cancel(id) {
      const reservation = reservations.get(id);
      if (!reservation) throw new ReservationNotFound(id);
      if (reservation.status !== 'active') return reservation;
      await refunds.issue(reservation.customerId, reservation.price);
      reservation.status = 'cancelled';
      stock.adjust(reservation.sku, reservation.qty);
      return reservation;
    },

    get(id) {
      return reservations.get(id);
    },
  };
}
