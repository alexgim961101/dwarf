const statuses = ['paid', 'pending', 'shipped', 'paid', 'cancelled', 'paid', 'refunded', 'shipped', 'paid', 'pending', 'shipped', 'paid'];

export const seedOrders = statuses.map((status, i) => ({
  id: `O-${String(1001 + i)}`,
  status,
  amount: 12000 + i * 1500,
  createdAt: new Date(Date.UTC(2026, 9, 1 + i, 9)).toISOString(),
}));
