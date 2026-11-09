// 한 줄 JSON 로그. 운영에서는 stdout을 수집기가 가져간다.
const levels = ['debug', 'info', 'warn', 'error'];

export function createLogger({ sink = console.log, level = 'info' } = {}) {
  const min = levels.indexOf(level);
  const at = (lvl) => (msg, fields = {}) => {
    if (levels.indexOf(lvl) < min) return;
    sink(JSON.stringify({ level: lvl, msg, ...fields, at: new Date().toISOString() }));
  };
  return { debug: at('debug'), info: at('info'), warn: at('warn'), error: at('error') };
}

export const silentLogger = createLogger({ sink: () => {} });
