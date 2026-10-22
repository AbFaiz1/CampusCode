import "server-only";

import { fetchText } from "./http";
import {
  HandleNotFoundError,
  type PlatformAdapter,
  type PlatformProfile,
  type RatingPoint,
  type RemoteContest,
} from "./types";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function decodeEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&#43;/g, "+")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'");
}

function stripTags(value: string): string {
  return decodeEntities(value.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

/** Reads a value cell that follows a given row label in an AtCoder profile table. */
function readProfileRow(html: string, label: string): string | null {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `<th[^>]*>\\s*${escaped}[\\s\\S]{0,300}?</th>\\s*<td[^>]*>([\\s\\S]*?)</td>`,
    "i",
  );
  const match = html.match(re);
  if (!match) return null;
  const text = stripTags(match[1]);
  return text.length ? text : null;
}

function readNumber(value: string | null): number | null {
  if (!value) return null;
  const match = value.match(/-?\d[\d,]*/);
  if (!match) return null;
  const n = Number(match[0].replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

/**
 * AtCoder renders times as `2026-10-24 21:00:00+0900` (JST, no colon in the
 * offset). Normalise it into something `Date` understands.
 */
export function parseAtCoderDate(value: string): Date | null {
  const match = value
    .trim()
    .match(
      /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?(?:\s*([+-])(\d{2}):?(\d{2}))?$/,
    );
  if (!match) return null;

  const [, year, month, day, hour, minute, second, sign, offsetHour, offsetMinute] = match;
  const offset = sign ? `${sign}${offsetHour}:${offsetMinute}` : "+09:00";
  const date = new Date(
    `${year}-${month}-${day}T${hour}:${minute}:${second ?? "00"}${offset}`,
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "02:30" or "240:00" -> minutes. */
function parseDuration(value: string): number | null {
  const match = value.trim().match(/^(\d+):(\d{2})$/);
  if (!match) return null;
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  return minutes > 0 ? minutes : null;
}

type AtCoderRankHistory = {
  EndTime: number;
  Rank: number;
  Rating: number;
  Competed: boolean;
  ContestName: string;
  ContestScreenName?: string;
};

/**
 * The AtCoder profile page embeds the user's complete rating history as a
 * JSON array (`var rank_history=[...]`), which is far more reliable than
 * scraping the results table.
 */
function extractRankHistory(html: string): AtCoderRankHistory[] {
  const marker = "var rank_history=";
  const index = html.indexOf(marker);
  if (index < 0) return [];
  const start = html.indexOf("[", index);
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
    const parsed = JSON.parse(html.slice(start, end + 1)) as AtCoderRankHistory[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function extractDisplayName(html: string): string | null {
  const match = html.match(
    /<a href="\/users\/[^"]+" class="username"><span[^>]*>([^<]*)<\/span><\/a>/,
  );
  if (!match) return null;
  const name = stripTags(match[1]);
  return name.length ? name : null;
}

function extractAvatar(html: string): string | null {
  // AtCoder renders the avatar right after the username anchor:
  // <a href="/users/x" class="username">…</a><img class='avatar' src='…'>
  const match = html.match(
    /class="username"[^>]*>\s*[^<]*(?:<[^>]+>[^<]*<\/[^>]+>)?\s*<\/a>\s*<img[^>]+class=['"]avatar['"][^>]*src=['"]([^'"]+)['"]/i,
  );
  const fallback = html.match(/<img[^>]+class=['"]avatar['"][^>]*src=['"]([^'"]+)['"]/i);
  const src = match?.[1] ?? fallback?.[1] ?? null;
  if (!src) return null;
  return src.startsWith("//") ? `https:${src}` : src;
}

export const atcoderAdapter: PlatformAdapter = {
  platform: "ATCODER",
  exposesRating: true,

  async fetchProfile(handle: string): Promise<PlatformProfile> {
    const html = await fetchText(
      `https://atcoder.jp/users/${encodeURIComponent(handle)}?lang=en`,
      { headers: { "User-Agent": USER_AGENT } },
    );

    if (/User Not Found|404 Not Found/i.test(html)) {
      throw new HandleNotFoundError("AtCoder", handle);
    }

    const ratingText = readProfileRow(html, "Rating");
    const maxRatingText = readProfileRow(html, "Highest Rating");
    const rankText = readProfileRow(html, "Rank");
    const ratedMatchesText = readProfileRow(html, "Rated Matches");
    const lastCompetingText = readProfileRow(html, "Last Competed");
    const affiliationText = readProfileRow(html, "Affiliation");

    const displayName = extractDisplayName(html);
    const avatarUrl = extractAvatar(html);
    const history = extractRankHistory(html);
    const competed = history.filter((h) => h.Competed);

    const lastContestAt = competed.length
      ? new Date(competed[competed.length - 1].EndTime * 1000)
      : lastCompetingText
        ? new Date(lastCompetingText.replace(/\//g, "-"))
        : null;

    return {
      handle,
      displayName,
      avatarUrl,
      rating: readNumber(ratingText),
      maxRating: readNumber(maxRatingText),
      rank: rankText ? stripTags(rankText) : null,
      globalRank: null,
      problemsSolved: null,
      contestsAttended: readNumber(ratedMatchesText) ?? (competed.length || null),
      contestsTotal: null,
      reputation: null,
      organization: affiliationText ? stripTags(affiliationText) : null,
      titlePhoto: null,
      lastContestAt:
        lastContestAt && !Number.isNaN(lastContestAt.getTime()) ? lastContestAt : null,
      streakDays: null,
      identityText: [displayName, affiliationText ? stripTags(affiliationText) : null].filter(
        (v): v is string => typeof v === "string" && v.length > 0,
      ),
      raw: { rank: rankText, ratedMatches: ratedMatchesText },
    };
  },

  async fetchRatingHistory(handle: string): Promise<RatingPoint[]> {
    const html = await fetchText(
      `https://atcoder.jp/users/${encodeURIComponent(handle)}?lang=en`,
      { headers: { "User-Agent": USER_AGENT } },
    );
    const history = extractRankHistory(html)
      .filter((h) => h.Competed)
      .sort((a, b) => a.EndTime - b.EndTime);

    return history.map((entry, index) => {
      const previous = index > 0 ? history[index - 1].Rating : null;
      return {
        contestName: entry.ContestName,
        externalId: `${handle}:${entry.ContestScreenName ?? entry.ContestName}:${entry.EndTime}`,
        rank: entry.Rank ?? null,
        ratingBefore: previous,
        ratingAfter: entry.Rating,
        delta: previous === null ? null : entry.Rating - previous,
        participatedAt: new Date(entry.EndTime * 1000),
      };
    });
  },

  async fetchContests(): Promise<RemoteContest[]> {
    const results: RemoteContest[] = [];
    const now = Date.now();
    const horizon = now + 1000 * 60 * 60 * 24 * 200;
    const seen = new Set<string>();

    for (let page = 1; page <= 4; page += 1) {
      const html = await fetchText(`https://atcoder.jp/contests/?page=${page}&lang=en`, {
        headers: { "User-Agent": USER_AGENT },
      });

      for (const section of ["Upcoming Contests", "Recent Contests", "Ongoing Contests"]) {
        const table = html.match(
          new RegExp(`<h3>${section}</h3>[\\s\\S]*?<table[^>]*>([\\s\\S]*?)</table>`, "i"),
        );
        if (!table) continue;

        const rows = table[1].match(/<tr>[\s\S]*?<\/tr>/g) ?? [];
        for (const row of rows) {
          const link = row.match(/<a href="\/contests\/([a-z0-9\-_]+)"/i);
          if (!link) continue;
          const slug = link[1];
          if (slug.startsWith("practice")) continue;
          if (seen.has(slug)) continue;

          const startMatch = row.match(/<time[^>]*>(\d{4}-\d{2}-\d{2}[^<]*)<\/time>/);
          if (!startMatch) continue;
          const start = parseAtCoderDate(startMatch[1]);
          if (!start) continue;

          const nameMatch = row.match(/<a href="\/contests\/[^"]+">([\s\S]*?)<\/a>/);
          const name = nameMatch ? stripTags(nameMatch[1]) : slug;

          const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g) ?? [];
          const durationMinutes = cells.length >= 3 ? parseDuration(stripTags(cells[2])) : null;

          seen.add(slug);
          results.push({
            externalId: slug,
            name,
            url: `https://atcoder.jp/contests/${slug}`,
            startTime: start,
            endTime: new Date(start.getTime() + (durationMinutes ?? 120) * 60 * 1000),
            durationMinutes,
            registrationDeadline: null,
            type: slug.startsWith("abc")
              ? "ABC"
              : slug.startsWith("arc")
                ? "ARC"
                : slug.startsWith("agc")
                  ? "AGC"
                  : slug.startsWith("ahc")
                    ? "HEURISTIC"
                    : null,
            participantCount: null,
            description: null,
          });
        }
      }
    }

    return results
      .filter((c) => c.startTime.getTime() > now - 1000 * 60 * 60 * 24 * 30)
      .filter((c) => c.startTime.getTime() < horizon);
  },
};
