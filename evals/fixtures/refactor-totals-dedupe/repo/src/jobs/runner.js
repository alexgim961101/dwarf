// 배치 작업 실행기. 작업과 작업이 쓰는 구현을 config/jobs.json에서 "파일#이름"으로 찾는다.
const ROOT = new URL('../../', import.meta.url);

async function load(ref) {
  const [file, name] = ref.split('#');
  const module = await import(new URL(file, ROOT));
  if (typeof module[name] !== 'function') throw new Error(`jobs.json: ${ref}는 함수가 아니다`);
  return module[name];
}

export async function runJob(name, { app, config }) {
  const spec = config[name];
  if (!spec) throw new Error(`없는 작업: ${name}`);
  const run = await load(spec.run);
  const uses = {};
  for (const [key, ref] of Object.entries(spec.with ?? {})) uses[key] = await load(ref);
  return run({ app, ...uses });
}
