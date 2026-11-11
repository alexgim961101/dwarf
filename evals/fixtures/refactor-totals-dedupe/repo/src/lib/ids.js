// 종류별 일련번호. ORD-0001, INV-0001, CN-0001.
export function createIds() {
  const counters = new Map();
  return {
    next(prefix) {
      const n = (counters.get(prefix) ?? 0) + 1;
      counters.set(prefix, n);
      return `${prefix}-${String(n).padStart(4, '0')}`;
    },
  };
}
