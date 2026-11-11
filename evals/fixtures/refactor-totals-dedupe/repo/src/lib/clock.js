// 시계. 테스트와 로컬 시드는 고정 시각으로 바꿔 끼운다.
export const systemClock = {
  now: () => new Date().toISOString(),
  today: () => new Date().toISOString().slice(0, 10),
};

export const fixedClock = (iso) => ({
  now: () => iso,
  today: () => iso.slice(0, 10),
});
