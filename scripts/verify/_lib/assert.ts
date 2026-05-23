export function log(emoji: string, msg: string, extra?: unknown) {
  if (extra !== undefined) console.log(`${emoji} ${msg}`, extra);
  else console.log(`${emoji} ${msg}`);
}

export function section(title: string) {
  console.log(`\n=== ${title} ===`);
}

export function assertEq<T>(actual: T, expected: T, msg: string) {
  if (actual !== expected) {
    throw new Error(`${msg}: atteso ${JSON.stringify(expected)}, ottenuto ${JSON.stringify(actual)}`);
  }
}

export async function assertOk(res: Response, msg?: string) {
  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.clone().json();
    } catch {
      body = await res.clone().text();
    }
    throw new Error(`${msg ?? "Expected 2xx"}: status=${res.status} body=${JSON.stringify(body)}`);
  }
}

export async function assertStatus(res: Response, expected: number, msg?: string) {
  if (res.status !== expected) {
    let body: unknown = null;
    try {
      body = await res.clone().json();
    } catch {
      body = await res.clone().text();
    }
    throw new Error(`${msg ?? `Expected ${expected}`}: got status=${res.status} body=${JSON.stringify(body)}`);
  }
}

export async function runSmoke(name: string, fn: () => Promise<void>): Promise<{ name: string; ok: boolean; error?: string }> {
  console.log(`\n▶ ${name}`);
  const start = Date.now();
  try {
    await fn();
    const ms = Date.now() - start;
    console.log(`✅ ${name} (${ms}ms)`);
    return { name, ok: true };
  } catch (err) {
    const ms = Date.now() - start;
    const message = (err as Error).message ?? String(err);
    console.error(`❌ ${name} (${ms}ms): ${message}`);
    if ((err as Error).stack) console.error((err as Error).stack);
    return { name, ok: false, error: message };
  }
}
