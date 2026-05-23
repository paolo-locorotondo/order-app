import type { HttpClient } from "./http";

export interface SessionInfo {
  user?: { email?: string; role?: string; id?: string };
}

export async function login(client: HttpClient, email: string, password: string): Promise<SessionInfo> {
  const csrfRes = await client.http("/api/auth/csrf");
  const csrf = (await csrfRes.json()) as { csrfToken: string };

  const form = new URLSearchParams({
    csrfToken: csrf.csrfToken,
    email,
    password,
    redirect: "false",
    callbackUrl: "/",
    json: "true",
  });
  const loginRes = await client.http("/api/auth/callback/credentials", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });

  const sessionRes = await client.http("/api/auth/session");
  const session = (await sessionRes.json()) as SessionInfo;
  if (!session?.user?.email) {
    throw new Error(`Login failed for ${email}: status=${loginRes.status} session=${JSON.stringify(session)}`);
  }
  return session;
}
