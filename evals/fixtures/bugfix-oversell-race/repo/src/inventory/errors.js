export class InsufficientStock extends Error {
  constructor(sku, available, requested) {
    super(`insufficient stock for ${sku}: ${available} < ${requested}`);
    this.code = 'INSUFFICIENT_STOCK';
  }
}

export class ReservationNotFound extends Error {
  constructor(id) {
    super(`reservation not found: ${id}`);
    this.code = 'RESERVATION_NOT_FOUND';
  }
}
