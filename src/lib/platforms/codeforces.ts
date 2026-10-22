import "server-only";

import { HttpError, fetchJson } from "./http";
import {
  HandleNotFoundError,
  type PlatformAdapter,
  type PlatformProfile,
  type RatingPoint,
  type RemoteContest,
} from "./types";

const API = "https://codeforces.com/api";

type CfUser = {
  handle: string;
  rating?: number;
  maxRating?: number;
  rank?: string;
  maxRank?: string;
  contribution?: number;
  titlePhoto?: string;
  avatar?: string;
  organization?: string;
  firstName?: string;
  lastName?: string;
  registrationTimeSeconds?: number;
  lastOnlineTimeSeconds?: number;
  friendOfCount?: number;
};

type CfContest = {
  id: number;
  name: string;
  type: string;
  phase: string;
  durationSeconds?: number;
  startTimeSeconds: number;
  relativeTimeSeconds?: number;
  description?: string;
  websiteUrl?: string;
  preparationTimeSeconds?: number;
  participantCount?: number;
  country?: string;
  city?: string;
};

type CfRatingEntry = {
  contestId: number;
  contestName: string;
  rank: number;
  /** Current Codeforces API field. */
  ratingUpdateTimeSeconds?: number;
  /** Legacy field name kept for older API mirrors. */
  ratingChangeTimeSeconds?: number;
  oldRating?: number;
  newRating?: number;
  /** Legacy single-rating field. */
  rating?: number;
};

type CfSubmission = {
  verdict: string;
  problem: { contestId: number; index: string; name: string };
};

async function fetchUser(handle: string): Promise<CfUser> {
  const data = await fetchJson<{ status: string; result?: CfUser[]; comment?: string }>(
    `${API}/user.info?handles=${encodeURIComponent(handle)}`,
  );
  if (data.status !== "OK" || !data.result || data.result.length === 0) {
    throw new HandleNotFoundError("Codeforces", handle);
  }
  return data.result[0];
}

/**
 * Codeforces does not expose a "problems solved" counter, so it is derived from
 * the public submission log. Only accepted submissions on distinct problems
 * count. The log is capped, so the value can be a lower bound for heavy users.
 */
async function fetchProblemsSolved(handle: string): Promise<{ count: number; truncated: boolean }> {
  const PAGE = 5000;
  const seen = new Set<string>();
  let truncated = false;

  for (let from = 1; from <= 2 * PAGE; from += PAGE) {
    let page: CfSubmission[];
    try {
      const data = await fetchJson<{
        status: string;
        result?: CfSubmission[];
      }>(`${API}/user.status?handle=${encodeURIComponent(handle)}&from=${from}&count=${PAGE}`);
      if (data.status !== "OK" || !data.result) break;
      page = data.result;
    } catch {
      break;
    }
    if (page.length === 0) {
      truncated = false;
      break;
    }
    for (const sub of page) {
      if (sub.verdict === "OK") {
        seen.add(`${sub.problem.contestId}:${sub.problem.index}`);
      }
    }
    if (page.length < PAGE) {
      truncated = false;
      break;
    }
    truncated = true;
  }

  return { count: seen.size, truncated };
}

export const codeforcesAdapter: PlatformAdapter = {
  platform: "CODEFORCES",
  exposesRating: true,

  async fetchProfile(handle: string): Promise<PlatformProfile> {
    const user = await fetchUser(handle);
    const identityText = [user.firstName, user.lastName, user.organization].filter(
      (v): v is string => typeof v === "string" && v.length > 0,
    );

    let problemsSolved: number | null = null;
    try {
      problemsSolved = (await fetchProblemsSolved(handle)).count;
    } catch {
      problemsSolved = null;
    }

    let contestsAttended: number | null = null;
    let lastContestAt: Date | null = null;
    try {
      const history = await codeforcesAdapter.fetchRatingHistory(handle);
      contestsAttended = history.length;
      lastContestAt = history.length ? history[history.length - 1].participatedAt : null;
    } catch {
      contestsAttended = null;
    }

    return {
      handle: user.handle,
      displayName: [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || null,
      avatarUrl: user.titlePhoto || user.avatar || null,
      rating: typeof user.rating === "number" ? user.rating : null,
      maxRating: typeof user.maxRating === "number" ? user.maxRating : null,
      rank: user.rank ?? user.maxRank ?? null,
      globalRank: null,
      problemsSolved,
      contestsAttended,
      contestsTotal: null,
      reputation: typeof user.contribution === "number" ? user.contribution : null,
      organization: user.organization ?? null,
      titlePhoto: user.titlePhoto ?? null,
      lastContestAt,
      streakDays: null,
      identityText,
      raw: { ...user },
    };
  },

  async fetchRatingHistory(handle: string): Promise<RatingPoint[]> {
    let result: CfRatingEntry[];
    try {
      const data = await fetchJson<{ status: string; result?: CfRatingEntry[] }>(
        `${API}/user.rating?handle=${encodeURIComponent(handle)}`,
      );
      if (data.status !== "OK" || !data.result) return [];
      result = data.result;
    } catch (err) {
      if (err instanceof HttpError) return [];
      throw err;
    }

    return result.map((entry, index) => {
      const after =
        entry.newRating ?? entry.rating ?? (entry.oldRating !== undefined ? entry.oldRating : null);
      const before =
        entry.oldRating ??
        (index > 0
          ? (result[index - 1].newRating ?? result[index - 1].rating ?? null)
          : null);
      const timestamp =
        entry.ratingUpdateTimeSeconds ?? entry.ratingChangeTimeSeconds ?? null;

      return {
        contestName: entry.contestName,
        externalId: String(entry.contestId),
        rank: entry.rank ?? null,
        ratingBefore: before,
        ratingAfter: after,
        delta: before === null || after === null ? null : after - before,
        participatedAt: timestamp ? new Date(timestamp * 1000) : new Date(0),
      };
    });
  },

  async fetchContests(): Promise<RemoteContest[]> {
    const data = await fetchJson<{ status: string; result?: CfContest[] }>(
      `${API}/contest.list?gym=false`,
    );
    if (data.status !== "OK" || !data.result) return [];

    const now = Date.now();
    const horizon = now + 1000 * 60 * 60 * 24 * 400;

    return data.result
      .filter((c) => {
        const start = c.startTimeSeconds * 1000;
        const end = start + (c.durationSeconds ?? 0) * 1000;
        return end > now - 1000 * 60 * 60 * 24 * 30 && start < horizon;
      })
      .map((c) => {
        const start = c.startTimeSeconds * 1000;
        const duration = c.durationSeconds ?? 0;
        return {
          externalId: String(c.id),
          name: c.name,
          url: c.websiteUrl || `https://codeforces.com/contests/${c.id}`,
          startTime: new Date(start),
          endTime: new Date(start + duration * 1000),
          durationMinutes: duration ? Math.round(duration / 60) : null,
          registrationDeadline: null,
          type: c.type ?? null,
          participantCount: c.participantCount ?? null,
          description: c.description ?? null,
        };
      });
  },
};
