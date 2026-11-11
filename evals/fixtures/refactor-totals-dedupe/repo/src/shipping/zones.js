// 도서산간. 배송비에 추가 요금이 붙는다.
const REMOTE = new Set(['jeju', 'ulleung', 'sinan']);

export const isRemote = (region) => REMOTE.has(region);
