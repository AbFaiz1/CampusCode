import "server-only";

const USER_AGENT =
  "CampusCode/1.0 (college competitive programming leaderboard; contact: support@campuscode.dev)";

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/**
 * Minimum delay between outbound requests, per host. Codeforces asks clients to
 * stay at roughly one request every two seconds; we are polite to every host.
 */
const HOST_INTERVAL_MS: Record<string, number> = {
  "codeforces.com": 2100,
  "leetcode.com": 1200,
  "www.codechef.com": 1200,
  "atcoder.jp": 1200,
};

const queues = new Map<string, Promise<unknown>>();
const lastRequestAt = new Map<string, number>();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function schedule<T>(host: string, task: () => Promise<T>): Promise<T> {
  const interval = HOST_INTERVAL_MS[host] ?? 500;
  const previous = queues.get(host) ?? Promise.resolve();
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  queues.set(
    host,
    previous.then(() => gate),
  );
  await previous;

  // Make sure the host has had a breather since the previous request.
  const elapsed = Date.now() - (lastRequestAt.get(host) ?? 0);
  if (elapsed < interval) {
    await sleep(interval - elapsed);
  }

  try {
    lastRequestAt.set(host, Date.now());
    return await task();
  } finally {
    release();
  }
}

async function request(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = 15000, ...rest } = init;
  const host = new URL(url).host;
  return schedule(host, async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        ...rest,
        signal: controller.signal,
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "*/*",
          "Accept-Language": "en-US,en;q=0.9",
          ...(rest.headers ?? {}),
        },
        cache: "no-store",
      });
      if (!res.ok) {
        throw new HttpError(`${host} responded ${res.status}`, res.status);
      }
      return res;
    } catch (err) {
      if (err instanceof HttpError) throw err;
      if (err instanceof Error && err.name === "AbortError") {
        throw new HttpError(`${host} request timed out`);
      }
      throw new HttpError(
        `${host} request failed: ${err instanceof Error ? err.message : "unknown error"}`,
      );
    } finally {
      clearTimeout(timer);
    }
  });
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await request(url, init);
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new HttpError(`${new URL(url).host} returned a non-JSON response`);
  }
}

export async function fetchText(url: string, init?: RequestInit): Promise<string> {
  const res = await request(url, init);
  return res.text();
}

export async function fetchGraphQL<T>(
  url: string,
  query: string,
  variables: Record<string, unknown>,
  init?: RequestInit,
): Promise<T> {
  const res = await request(url, {
    method: "POST",
    ...init,
    headers: {
      "Content-Type": "application/json",
      Origin: new URL(url).origin,
      Referer: `${new URL(url).origin}/contest/`,
      ...(init?.headers ?? {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  const text = await res.text();
  let parsed: { data?: T; errors?: { message: string }[] };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new HttpError(`${new URL(url).host} returned a non-JSON response`);
  }
  if (parsed.errors?.length) {
    throw new HttpError(parsed.errors.map((e) => e.message).join("; "));
  }
  if (!parsed.data) throw new HttpError(`${new URL(url).host} returned no data`);
  return parsed.data;
}
