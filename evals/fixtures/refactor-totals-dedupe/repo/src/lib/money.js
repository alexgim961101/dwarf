// 원 단위 금액 표시. 12345 → "12,345원"
export const formatWon = (amount) => `${amount.toLocaleString('ko-KR')}원`;
