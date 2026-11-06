// 고객 설정에 따라 보낼 채널을 고른다. 설정이 없으면 이메일만.
export function channelsFor(event) {
  const prefs = event.customer.notify ?? ['email'];
  return prefs.filter((channel) => channel === 'email' || channel === 'sms');
}
