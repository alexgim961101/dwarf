// 시계. 테스트에서 바꿔 끼운다.
export function createClock(now = () => new Date()) {
  return { now };
}
