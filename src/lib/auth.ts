import "server-only";

import { randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { prisma } from "@/lib/db";
export { hashPassword, verifyPassword } from "@/lib/password";

const SESSION_COOKIE = "campuscode_session";
const SESSION_TTL_DAYS = 30;

/**
 * The session cookie is only marked `Secure` when the request actually
 * arrives over HTTPS, so a local production build served over plain HTTP
 * still keeps its session.
 */
async function shouldUseSecureCookie(): Promise<boolean> {
  if (process.env.NODE_ENV !== "production") return false;

  const store = await headers();
  const forwarded = store.get("x-forwarded-proto");
  if (forwarded) return forwarded.split(",")[0]?.trim() === "https";

  const host = (store.get("host") ?? "").toLowerCase();
  const isLocal =
    host.startsWith("localhost") || host.startsWith("127.0.0.1") || host.startsWith("[::1]");
  return !isLocal;
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({ data: { token, userId, expiresAt } });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: await shouldUseSecureCookie(),
    path: "/",
    expires: expiresAt,
  });
  return token;
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }
  store.delete(SESSION_COOKIE);
}

export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
  role: string;
  avatarUrl: string | null;
  collegeId: string | null;
  campusScore: number;
  campusClass: string;
};

export const getSessionUser = cache(async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  const { user } = session;
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    avatarUrl: user.avatarUrl,
    collegeId: user.collegeId,
    campusScore: user.campusScore,
    campusClass: user.campusClass,
  };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}

