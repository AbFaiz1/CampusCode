/**
 * End-to-end smoke test against a running CampusCode server.
 *
 *   npm run build && npm start          # in one terminal
 *   npx tsx scripts/smoke-app.ts        # in another
 *
 * Exercises the real HTTP surface: auth gate, login, protected pages, public
 * pages, JSON APIs, the ICS feed and the cron endpoints.
 */
import { randomUUID } from "node:crypto";

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";

let failures = 0;
let checks = 0;

function check(name: string, ok: boolean, detail = "") {
  checks += 1;
  if (ok) {
    console.log(`  ok   ${name}`);
  } else {
    failures += 1;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

type Session = { cookie: string };

async function get(path: string, session?: Session) {
  const res = await fetch(`${BASE}${path}`, {
    redirect: "manual",
    headers: session ? { cookie: session.cookie } : {},
  });
  return res;
}

/** Pulls the React server-action fields out of a rendered form. */
function formFields(html: string): { name: string; value: string }[] {
  const form = html.match(/<form[\s\S]*?<\/form>/);
  if (!form) return [];
  const fields: { name: string; value: string }[] = [];
  for (const tag of form[0].match(/<input\b[^>]*>/g) ?? []) {
    const name = tag.match(/name="([^"]+)"/);
    if (!name) continue;
    const value = tag.match(/value="([^"]*)"/);
    fields.push({ name: name[1], value: value ? decodeEntities(value[1]) : "" });
  }
  return fields;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

async function submitForm(
  path: string,
  actionFields: { name: string; value: string }[],
  extra: Record<string, string>,
): Promise<Response> {
  const body = new FormData();
  for (const field of actionFields) body.append(field.name, field.value);
  for (const [key, value] of Object.entries(extra)) body.append(key, value);

  return fetch(`${BASE}${path}`, {
    method: "POST",
    redirect: "manual",
    headers: {
      origin: BASE,
      referer: `${BASE}${path}`,
    },
    body,
  });
}

function sessionCookieFrom(res: Response): string | null {
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) return null;
  const match = setCookie.match(/campuscode_session=([^;]+)/);
  return match ? `campuscode_session=${match[1]}` : null;
}

async function login(email: string, password: string, next?: string) {
  const url = next ? `/login?next=${encodeURIComponent(next)}` : "/login";
  const page = await fetch(`${BASE}${url}`);
  const html = await page.text();
  const fields = formFields(html).filter((f) =>
    ["$ACTION_REF_1", "$ACTION_1:0", "$ACTION_1:1", "$ACTION_KEY", "next"].includes(f.name),
  );
  const res = await submitForm("/login", fields, { email, password });
  return { res, cookie: sessionCookieFrom(res) };
}

async function main() {
  console.log(`CampusCode app smoke test against ${BASE}\n`);

  console.log("public pages");
  for (const path of ["/", "/methodology", "/leaderboard", "/directory", "/contests", "/login", "/signup"]) {
    const res = await get(path);
    check(`GET ${path} -> 200`, res.status === 200, `got ${res.status}`);
  }

  console.log("\nnot found");
  {
    const res = await get("/definitely-not-a-page");
    check("GET /definitely-not-a-page -> 404", res.status === 404, `got ${res.status}`);
  }

  console.log("\nauth gate");
  for (const path of ["/dashboard", "/friends", "/groups", "/settings", "/notifications"]) {
    const res = await get(path);
    const location = res.headers.get("location") ?? "";
    check(
      `GET ${path} -> 307 to /login`,
      res.status === 307 && location.includes("/login"),
      `got ${res.status} ${location}`,
    );
  }

  console.log("\nlogin");
  const { res: loginRes, cookie } = await login("aarav@campuscode.dev", "campuscode123", "/contests");
  check("login -> 303", loginRes.status === 303, `got ${loginRes.status}`);
  check("login sets session cookie", cookie !== null);
  check(
    "login honours ?next",
    (loginRes.headers.get("location") ?? "").endsWith("/contests"),
    `got ${loginRes.headers.get("location")}`,
  );

  if (!cookie) {
    console.log("\nlogin failed, aborting");
    process.exit(1);
  }
  const session: Session = { cookie };

  console.log("\nwrong password");
  {
    const { res } = await login("aarav@campuscode.dev", "wrong-password");
    check("bad password -> not a redirect to app", res.status !== 303, `got ${res.status}`);
  }

  console.log("\nprotected pages");
  for (const path of [
    "/dashboard",
    "/friends",
    "/groups",
    "/settings",
    "/notifications",
    "/leaderboard",
    "/directory",
    "/contests",
  ]) {
    const res = await get(path, session);
    const html = await res.text();
    const empty = !/<main[\s\S]*?<\/main>/.test(html) || html.length < 3000;
    check(`GET ${path} -> 200 with content`, res.status === 200 && !empty, `got ${res.status}`);
  }

  console.log("\npublic profile");
  {
    const dir = await get("/api/directory?limit=1", session);
    const data = (await dir.json()) as { entries: { id: string; displayName: string }[] };
    check("directory api returns a student", data.entries.length > 0);
    const profile = await get(`/u/${data.entries[0]!.id}`);
    const html = await profile.text();
    check(
      "profile page renders the student name",
      profile.status === 200 && html.includes(data.entries[0]!.displayName),
      `got ${profile.status}`,
    );
  }

  console.log("\njson apis");
  {
    const dir = await get("/api/directory?limit=5", session);
    const dirBody = (await dir.json()) as { total: number; entries: unknown[] };
    check("GET /api/directory -> json", dir.status === 200 && Array.isArray(dirBody.entries));

    const board = await get("/api/leaderboard?scope=college", session);
    const boardBody = (await board.json()) as { entries: unknown[] };
    check("GET /api/leaderboard -> json", board.status === 200 && Array.isArray(boardBody.entries));

    const contests = await get("/api/contests?platform=ALL&status=UPCOMING&limit=5", session);
    const contestsBody = (await contests.json()) as { contests: unknown[] };
    check("GET /api/contests -> json", contests.status === 200 && Array.isArray(contestsBody.contests));

    const notifications = await get("/api/notifications", session);
    const notificationsBody = (await notifications.json()) as { notifications: unknown[] };
    check(
      "GET /api/notifications -> json",
      notifications.status === 200 && Array.isArray(notificationsBody.notifications),
    );
  }

  console.log("\nics feed");
  {
    const res = await get("/api/contests/calendar.ics", session);
    const body = await res.text();
    check(
      "GET /api/contests/calendar.ics -> calendar",
      res.status === 200 && body.startsWith("BEGIN:VCALENDAR") && body.includes("BEGIN:VEVENT"),
      `got ${res.status}`,
    );
  }

  console.log("\ncron endpoints");
  {
    const reminders = await fetch(`${BASE}/api/cron/reminders`, { method: "POST" });
    const remindersBody = (await reminders.json()) as { ok: boolean };
    check("POST /api/cron/reminders -> ok", reminders.status === 200 && remindersBody.ok === true);

    const contests = await fetch(`${BASE}/api/cron/sync-contests`, { method: "POST" });
    const contestsBody = (await contests.json()) as { ok: boolean; results: unknown[] };
    check(
      "POST /api/cron/sync-contests -> ok",
      contests.status === 200 && contestsBody.ok === true && contestsBody.results.length === 4,
    );
  }

  console.log("\nsignup");
  let smokeEmail: string | null = null;
  {
    const email = `smoke-${randomUUID().slice(0, 8)}@campuscode.dev`;
    smokeEmail = email;
    const page = await fetch(`${BASE}/signup`);
    const html = await page.text();
    const fields = formFields(html).filter((f) =>
      ["$ACTION_REF_1", "$ACTION_1:0", "$ACTION_1:1", "$ACTION_KEY"].includes(f.name),
    );
    const res = await submitForm("/signup", fields, {
      displayName: "Smoke Tester",
      email,
      password: "campuscode123",
      batch: "2030",
    });
    const newCookie = sessionCookieFrom(res);
    check("signup -> 303", res.status === 303, `got ${res.status}`);
    check("signup sets session cookie", newCookie !== null);
    if (newCookie) {
      const dash = await get("/dashboard", { cookie: newCookie });
      const dashHtml = await dash.text();
      check(
        "new account reaches the dashboard",
        dash.status === 200 && dashHtml.includes("Smoke Tester"),
        `got ${dash.status}`,
      );
    }
  }

  console.log("\nlogout");
  {
    const page = await get("/dashboard", session);
    const html = await page.text();
    const form = html.match(/<form[^>]*>([\s\S]*?)<\/form>/g) ?? [];
    const logoutForm = form.find((f) => f.includes("Log out"));
    check("dashboard renders a logout form", logoutForm !== undefined);
    if (logoutForm) {
      const fields = formFields(logoutForm);
      const res = await submitForm("/dashboard", fields, {});
      check("logout -> redirect", res.status === 303 || res.status === 307, `got ${res.status}`);
      const after = await get("/dashboard");
      check(
        "session destroyed after logout",
        after.status === 307,
        `got ${after.status}`,
      );
    }
  }

  console.log(`\n${checks - failures}/${checks} checks passed`);
  await cleanup(smokeEmail);
  process.exit(failures === 0 ? 0 : 1);
}

/** Removes the throwaway account the signup check created. */
async function cleanup(email: string | null): Promise<void> {
  if (!email) return;
  try {
    const { prisma } = await import("@/lib/db");
    await prisma.user.deleteMany({ where: { email } });
    console.log(`cleaned up ${email}`);
  } catch (error) {
    console.log(`could not clean up ${email}: ${String(error)}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
