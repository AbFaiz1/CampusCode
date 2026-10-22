import "server-only";

import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import {
  PLATFORM_LABELS,
  PLATFORM_URLS,
  isPlatform,
  type Platform,
} from "@/lib/constants";
import { adapterFor, HandleNotFoundError } from "@/lib/platforms";

export function generateVerificationCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `CC-${out}`;
}

export class AccountError extends Error {
  constructor(
    message: string,
    readonly code:
      | "INVALID_PLATFORM"
      | "INVALID_HANDLE"
      | "HANDLE_TAKEN"
      | "NOT_FOUND"
      | "UPSTREAM_ERROR"
      | "UNAUTHENTICATED",
  ) {
    super(message);
    this.name = "AccountError";
  }
}

function normaliseHandle(platform: Platform, handle: string): string {
  const trimmed = handle.trim().replace(/^@/, "");
  if (!trimmed) throw new AccountError("Enter a handle", "INVALID_HANDLE");
  if (platform === "LEETCODE") return trimmed.toLowerCase();
  if (platform === "CODECHEF") return trimmed.toLowerCase();
  if (platform === "ATCODER") return trimmed.toLowerCase();
  return trimmed;
}

/**
 * Decide whether the linked account is genuinely owned by the student.
 *
 * 1. CODE_MATCH — the student pasted the one-time code into the display name
 *    or organisation field of their platform profile. Strongest proof.
 * 2. COLLEGE_MATCH — the platform profile mentions the student's college or
 *    its email domain. Weaker: recorded but left unverified.
 * 3. Otherwise the account is linked but UNVERIFIED.
 */
function evaluateVerification(args: {
  identityText: string[];
  code: string;
  collegeName?: string | null;
  emailDomain?: string | null;
}): { status: string; method: string | null } {
  const haystack = args.identityText.join(" ").toUpperCase();
  const code = args.code.toUpperCase();

  if (haystack.includes(code)) {
    return { status: "VERIFIED", method: "CODE_MATCH" };
  }
  if (args.collegeName && haystack.includes(args.collegeName.toUpperCase())) {
    return { status: "PENDING", method: "COLLEGE_DOMAIN" };
  }
  if (args.emailDomain && haystack.includes(args.emailDomain.toUpperCase())) {
    return { status: "PENDING", method: "COLLEGE_DOMAIN" };
  }
  return { status: "UNVERIFIED", method: null };
}

/**
 * Step 1: Request a verification token for an account.
 * Generates a token, stores it in the LinkedAccount, and sets status to PENDING.
 */
export async function requestVerificationToken(args: {
  userId: string;
  platform: string;
  handle: string;
}): Promise<{ accountId: string; token: string; message: string }> {
  const { userId, platform: platformRaw, handle: handleRaw } = args;
  if (!isPlatform(platformRaw)) {
    throw new AccountError("Unsupported platform", "INVALID_PLATFORM");
  }
  const platform = platformRaw;
  const handle = normaliseHandle(platform, handleRaw);

  const existingClaim = await prisma.linkedAccount.findUnique({
    where: { platform_handle: { platform, handle } },
    include: { user: { select: { displayName: true } } },
  });
  if (existingClaim && existingClaim.userId !== userId) {
    throw new AccountError(
      `That ${PLATFORM_LABELS[platform]} account is already linked to another student. If that is you, remove it there first.`,
      "HANDLE_TAKEN",
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { college: true },
  });
  if (!user) throw new AccountError("Not signed in", "UNAUTHENTICATED");

  const adapter = adapterFor(platform);
  let profile;
  try {
    profile = await adapter.fetchProfile(handle);
  } catch (err) {
    if (err instanceof HandleNotFoundError) {
      throw new AccountError(
        `No ${PLATFORM_LABELS[platform]} account found for "${handle}".`,
        "NOT_FOUND",
      );
    }
    throw new AccountError(
      `Could not reach ${PLATFORM_LABELS[platform]}: ${err instanceof Error ? err.message : "unknown error"}`,
      "UPSTREAM_ERROR",
    );
  }

  const token = generateVerificationCode();
  const data = {
    handle: profile.handle ?? handle,
    profileUrl: PLATFORM_URLS[platform](profile.handle ?? handle),
    rating: profile.rating,
    maxRating: profile.maxRating,
    rank: profile.rank,
    globalRank: profile.globalRank,
    problemsSolved: profile.problemsSolved,
    contestsAttended: profile.contestsAttended,
    contestsTotal: profile.contestsTotal,
    reputation: profile.reputation,
    organization: profile.organization,
    titlePhoto: profile.titlePhoto ?? profile.avatarUrl,
    lastContestAt: profile.lastContestAt,
    streakDays: profile.streakDays,
    verificationStatus: "PENDING",
    verificationMethod: null,
    verifiedAt: null,
    pendingVerificationToken: token,
    lastSyncedAt: new Date(),
    syncStatus: "OK",
    syncError: null,
    rawJson: JSON.stringify(profile.raw ?? {}),
  };

  const account = await prisma.linkedAccount.upsert({
    where: { platform_handle: { platform, handle: data.handle } },
    create: { userId, platform, ...data },
    update: { ...data },
  });

  // We still maintain the verificationClaim for auditing/legacy reasons
  await prisma.verificationClaim.upsert({
    where: { platform_handle: { platform, handle: data.handle } },
    create: {
      userId,
      platform,
      handle: data.handle,
      code: token,
      status: "PENDING",
      method: null,
      reviewedAt: null,
    },
    update: {
      code: token,
      status: "PENDING",
      method: null,
      reviewedAt: null,
    },
  });

  return {
    accountId: account.id,
    token,
    message: `Add "${token}" to your ${PLATFORM_LABELS[platform]} display name or organization field to verify ownership.`,
  };
}

/**
 * Step 2: Verify the account by checking if the stored token is in the platform profile.
 */
export async function verifyAccount(args: {
  userId: string;
  accountId: string;
}): Promise<{ status: string; message: string }> {
  const { userId, accountId } = args;

  const account = await prisma.linkedAccount.findUnique({
    where: { id: accountId },
  });
  if (!account) throw new AccountError("Account not found", "NOT_FOUND");
  if (account.userId !== userId) throw new AccountError("Unauthorized", "UNAUTHENTICATED");
  if (!account.pendingVerificationToken) {
    throw new AccountError("No pending verification token found for this account.", "INVALID_HANDLE");
  }

  const adapter = adapterFor(account.platform as Platform);
  const profile = await adapter.fetchProfile(account.handle);

  const verification = evaluateVerification({
    identityText: profile.identityText,
    code: account.pendingVerificationToken,
    collegeName: null, // Token match is the primary proof
    emailDomain: null,
  });

  if (verification.status === "VERIFIED") {
    await prisma.linkedAccount.update({
      where: { id: accountId },
      data: {
        verificationStatus: "VERIFIED",
        verificationMethod: "CODE_MATCH",
        verifiedAt: new Date(),
        pendingVerificationToken: null,
      },
    });

    await prisma.verificationClaim.update({
      where: { platform_handle: { platform: account.platform, handle: account.handle } },
      data: {
        status: "APPROVED",
        method: "CODE_MATCH",
        reviewedAt: new Date(),
      },
    });

    return { status: "VERIFIED", message: `${PLATFORM_LABELS[account.platform as Platform]} account verified successfully.` };
  }

  return { status: "UNVERIFIED", message: `Token not found in ${PLATFORM_LABELS[account.platform as Platform]} profile. Please ensure the code is exactly as provided.` };
}

export async function unlinkAccount(userId: string, accountId: string): Promise<void> {
  const account = await prisma.linkedAccount.findFirst({ where: { id: accountId, userId } });
  if (!account) throw new AccountError("Account not found", "NOT_FOUND");
  await prisma.linkedAccount.delete({ where: { id: accountId } });
}

export async function syncAccount(accountId: string): Promise<{
  ok: boolean;
  message: string;
  updated: number;
}> {
  const account = await prisma.linkedAccount.findUnique({ where: { id: accountId } });
  if (!account) return { ok: false, message: "Account not found", updated: 0 };

  const adapter = adapterFor(account.platform as Platform);
  try {
    const profile = await adapter.fetchProfile(account.handle);
    await prisma.linkedAccount.update({
      where: { id: accountId },
      data: {
        handle: profile.handle,
        profileUrl: PLATFORM_URLS[account.platform as Platform](profile.handle),
        rating: profile.rating,
        maxRating: profile.maxRating,
        rank: profile.rank,
        globalRank: profile.globalRank,
        problemsSolved: profile.problemsSolved,
        contestsAttended: profile.contestsAttended,
        reputation: profile.reputation,
        organization: profile.organization,
        titlePhoto: profile.titlePhoto ?? profile.avatarUrl,
        lastContestAt: profile.lastContestAt,
        lastSyncedAt: new Date(),
        syncStatus: "OK",
        syncError: null,
        rawJson: JSON.stringify(profile.raw ?? {}),
      },
    });

    let historyCount = 0;
    let derivedMaxRating: number | null = null;
    let derivedLastContestAt: Date | null = null;
    try {
      const history = await adapter.fetchRatingHistory(account.handle);
      for (const point of history) {
        if (point.ratingAfter !== null) {
          derivedMaxRating =
            derivedMaxRating === null
              ? point.ratingAfter
              : Math.max(derivedMaxRating, point.ratingAfter);
        }
        if (!derivedLastContestAt || point.participatedAt > derivedLastContestAt) {
          derivedLastContestAt = point.participatedAt;
        }
      }

      // Parallelize history upserts in concurrent batches of 15
      const chunkSize = 15;
      for (let i = 0; i < history.length; i += chunkSize) {
        const chunk = history.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map((point) =>
            prisma.ratingHistory.upsert({
              where: {
                userId_platform_externalId: {
                  userId: account.userId,
                  platform: account.platform,
                  externalId: point.externalId,
                },
              },
              create: {
                accountId: account.id,
                userId: account.userId,
                platform: account.platform,
                contestName: point.contestName,
                externalId: point.externalId,
                rank: point.rank,
                ratingBefore: point.ratingBefore,
                ratingAfter: point.ratingAfter,
                delta: point.delta,
                participatedAt: point.participatedAt,
              },
              update: {
                ratingBefore: point.ratingBefore,
                ratingAfter: point.ratingAfter,
                delta: point.delta,
                rank: point.rank,
                participatedAt: point.participatedAt,
              },
            }),
          ),
        );
      }
      historyCount = history.length;
    } catch {
      // Rating history is best-effort; the profile sync still succeeded.
    }

    // Some platforms only expose the peak rating and the last contest date
    // through their rating history.
    if (derivedMaxRating !== null || derivedLastContestAt !== null) {
      await prisma.linkedAccount.update({
        where: { id: accountId },
        data: {
          ...(profile.maxRating === null && derivedMaxRating !== null
            ? { maxRating: derivedMaxRating }
            : {}),
          ...(profile.lastContestAt === null && derivedLastContestAt !== null
            ? { lastContestAt: derivedLastContestAt }
            : {}),
        },
      });
    }

    await prisma.user.update({
      where: { id: account.userId },
      data: { lastActiveAt: new Date() },
    });

    return { ok: true, message: `Synced ${account.handle}`, updated: historyCount };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown sync failure";
    await prisma.linkedAccount.update({
      where: { id: accountId },
      data: { syncStatus: "ERROR", syncError: message, lastSyncedAt: new Date() },
    });
    return { ok: false, message, updated: 0 };
  }
}
