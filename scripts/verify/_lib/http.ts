export const BASE_URL = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";

export interface HttpClient {
  http(path: string, init?: RequestInit): Promise<Response>;
  cookies: Record<string, string>;
  reset(): void;
}

export function createHttpClient(baseUrl: string = BASE_URL): HttpClient {
  const cookies: Record<string, string> = {};

  function buildCookieHeader(): string {
    return Object.entries(cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }

  function ingestSetCookie(res: Response) {
    const list: string[] = res.headers.getSetCookie?.() ?? [];
    for (const raw of list) {
      const [pair] = raw.split(";");
      const idx = pair.indexOf("=");
      if (idx === -1) continue;
      const name = pair.slice(0, idx).trim();
      const value = pair.slice(idx + 1).trim();
      cookies[name] = value;
    }
  }

  async function http(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    if (Object.keys(cookies).length) headers.set("cookie", buildCookieHeader());
    const res = await fetch(`${baseUrl}${path}`, { ...init, headers, redirect: "manual" });
    ingestSetCookie(res);
    return res;
  }

  function reset() {
    for (const k of Object.keys(cookies)) delete cookies[k];
  }

  return { http, cookies, reset };
}

export async function checkServerReachable(baseUrl: string = BASE_URL): Promise<void> {
  try {
    const res = await fetch(`${baseUrl}/api/auth/csrf`, { redirect: "manual" });
    if (!res.ok && res.status !== 302) {
      throw new Error(`Server reachable but returned ${res.status}`);
    }
  } catch (err) {
    throw new Error(
      `Dev server not reachable at ${baseUrl}. Start it with 'npm run dev' before running smokes. Cause: ${(err as Error).message}`,
    );
  }
}
