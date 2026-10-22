import "server-only";

import { fetchJson, fetchText } from "./http";
import {
  HandleNotFoundError,
  type PlatformAdapter,
  type PlatformProfile,
  type RatingPoint,
  type RemoteContest,
} from "./types";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

type CcContest = {
  contest_id: string;
  contest_code: string;
  contest_name: string;
  contest_start_date_iso: string;
  contest_end_date_iso: string;
  contest_duration: string;
  category?: string;
  contest_type?: string;
  organization?: string;
};

type CcContestResponse = {
  status: string;
  present_contests?: CcContest[];
  future_contests?: CcContest[];
  past_contests?: CcContest[];
};

type CcRatingEntry = {
  code: string;
  name: string;
  rating: string;
  rank: string;
  end_date: string;
};

function parseHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
}

/**
 * CodeChef embeds a JSON blob on the profile page containing the user's full
 * rating history (`date_versus_rating.all`). We read the most recent entry as
 * the current rating and the maximum across entries as the peak rating.
 */
function extractRatingHistory(html: string): CcRatingEntry[] {
  const key = '"date_versus_rating":';
  const keyIndex = html.indexOf(key);
  if (keyIndex < 0) return [];

  const allIndex = html.indexOf('"all"', keyIndex);
  if (allIndex < 0) return [];

  const start = html.indexOf("[", allIndex);
  if (start < 0) return [];

  let depth = 0;
  let end = start;
  for (let i = start; i < html.length; i += 1) {
    const ch = html[i];
    if (ch === "[") depth += 1;
    else if (ch === "]") {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end <= start) return [];

  try {
    const parsed = JSON.parse(html.slice(start, end + 1)) as CcRatingEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseDate(value: string | undefined | null): Date | null {
  if (!value) return null;
  // CodeChef uses "2023-02-08 22:30:00" in IST.
  const iso = value.includes("T") ? value : value.replace(" ", "T");
  const withZone = /[Zz]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}+05:30`;
  const d = new Date(withZone);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const codechefAdapter: PlatformAdapter = {
  platform: "CODECHEF",
  exposesRating: true,

  async fetchProfile(handle: string): Promise<PlatformProfile> {
    const html = await fetchText(`https://www.codechef.com/users/${encodeURIComponent(handle)}`, {
      headers: { "User-Agent": USER_AGENT },
    });

    if (/Page Not Found|page not found|<title>\s*Error/i.test(html)) {
      throw new HandleNotFoundError("CodeChef", handle);
    }

    const history = extractRatingHistory(html);
    const ratings = history
      .map((h) => Number(h.rating))
      .filter((n) => Number.isFinite(n) && n > 0);

    const current = ratings.length ? ratings[ratings.length - 1] : null;
    const max = ratings.length ? Math.max(...ratings) : null;

    const displayNameMatch = html.match(
      /<h1[^>]*class="[^"]*h2-style[^"]*"[^>]*>([\s\S]*?)<\/h1>/i,
    );
    const displayName = displayNameMatch
      ? parseHtml(displayNameMatch[1]).trim().replace(/\s+/g, " ")
      : null;

    const organizationMatch = html.match(/Organization\s*<\/div>\s*<div[^>]*>([\s\S]*?)<\/div>/i);
    const organization = organizationMatch
      ? parseHtml(organizationMatch[1]).trim().replace(/\s+/g, " ")
      : null;

    const lastEntry = history[history.length - 1];

    return {
      handle,
      displayName: displayName || null,
      avatarUrl: null,
      rating: current,
      maxRating: max,
      rank: lastEntry?.rank ? `Rank ${lastEntry.rank}` : null,
      globalRank: null,
      problemsSolved: null,
      contestsAttended: history.length || null,
      contestsTotal: null,
      reputation: null,
      organization: organization || null,
      titlePhoto: null,
      lastContestAt: parseDate(lastEntry?.end_date),
      streakDays: null,
      identityText: [displayName, organization].filter(
        (v): v is string => typeof v === "string" && v.length > 0,
      ),
      raw: { history: history.slice(-40) },
    };
  },

  async fetchRatingHistory(handle: string): Promise<RatingPoint[]> {
    const html = await fetchText(`https://www.codechef.com/users/${encodeURIComponent(handle)}`, {
      headers: { "User-Agent": USER_AGENT },
    });
    const history = extractRatingHistory(html);
    if (!history.length) return [];

    return history.map((entry, index) => {
      const previousValue = index > 0 ? Number(history[index - 1].rating) : null;
      const previous = previousValue !== null && Number.isFinite(previousValue) ? previousValue : null;
      const after = Number(entry.rating);
      return {
        contestName: entry.name,
        externalId: entry.code,
        rank: Number.isFinite(Number(entry.rank)) ? Number(entry.rank) : null,
        ratingBefore: previous,
        ratingAfter: Number.isFinite(after) ? after : null,
        delta: previous !== null ? after - previous : null,
        participatedAt: parseDate(entry.end_date) ?? new Date(0),
      };
    });
  },

  async fetchContests(): Promise<RemoteContest[]> {
    const data = await fetchJson<CcContestResponse>(
      "https://www.codechef.com/api/list/contests/all",
      { headers: { "User-Agent": USER_AGENT } },
    );
    if (data.status !== "success") return [];

    const all = [
      ...(data.present_contests ?? []),
      ...(data.future_contests ?? []),
      ...(data.past_contests ?? []),
    ];

    const now = Date.now();
    const horizon = now + 1000 * 60 * 60 * 24 * 200;

    return all
      .filter((c) => {
        const start = c.contest_start_date_iso ? new Date(c.contest_start_date_iso).getTime() : NaN;
        return Number.isFinite(start) && start > now - 1000 * 60 * 60 * 24 * 21 && start < horizon;
      })
      .map((c) => {
        const start = new Date(c.contest_start_date_iso);
        const end = new Date(c.contest_end_date_iso);
        const minutes = Number(c.contest_duration);
        return {
          externalId: c.contest_code || c.contest_id,
          name: c.contest_name,
          url: `https://www.codechef.com/${c.contest_code || c.contest_id}`,
          startTime: start,
          endTime: Number.isNaN(end.getTime()) ? start : end,
          durationMinutes: Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes) : null,
          registrationDeadline: null,
          type: c.contest_type ?? c.category ?? null,
          participantCount: null,
          description: c.organization ? `Hosted by ${c.organization}` : null,
        };
      });
  },
};
