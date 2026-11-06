export class BadRequest extends Error {}

export function parsePagination(params) {
  const page = params.has('page') ? Number(params.get('page')) : 1;
  const size = params.has('size') ? Number(params.get('size')) : 20;
  if (!Number.isInteger(page) || page < 1) throw new BadRequest('invalid page');
  if (!Number.isInteger(size) || size < 1 || size > 100) throw new BadRequest('invalid size');
  return { page, size };
}
