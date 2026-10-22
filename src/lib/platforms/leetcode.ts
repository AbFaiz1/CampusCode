import "server-only";

import { fetchGraphQL } from "./http";
import {
  HandleNotFoundError,
  type PlatformAdapter,
  type PlatformProfile,
  type RatingPoint,
  type RemoteContest,
} from "./types";

const GRAPHQL = "https://leetcode.com/graphql";

type LcSubmitStats = {
  acSubmissionNum: { difficulty: string; count: number }[];
};

type LcContest = {
  title: string;
  titleSlug: string;
  startTime: number;
  duration: number;
};

type LcContestRanking = {
  rating: number | null;
  globalRanking: number | null;
  totalParticipants: number | null;
  attendedContestsCount: number | null;
};

type LcHistoryEntry = {
  rating: number | null;
  ranking: number | null;
  attended: boolean | null;
  contest: LcContest | null;
};

/**
 * LeetCode's public GraphQL API exposes the numeric **contest** rating
 * (`userContestRanking.rating`), the contest global rank and the full
 * contest-by-contest rating history (`userContestRankingHistory`). The
 * solution-oriented global rank lives on `profile.ranking`.
 *
 * The HTML and REST endpoints sit behind a bot challenge, so everything here
 * goes through the GraphQL endpoint only.
 */
export const leetcodeAdapter: PlatformAdapter = {
  platform: "LEETCODE",
  exposesRating: true,

  async fetchProfile(handle: string): Promise<PlatformProfile> {
    const data = await fetchGraphQL<{
      matchedUser: {
        username: string;
        profile: {
          realName: string | null;
          userSlug: string | null;
          userAvatar: string | null;
          aboutMe: string | null;
          ranking: number | null;
          reputation: number | null;
          solutionCount: number | null;
          contestCount: number | null;
          starRating: number | null;
          websites: string[] | null;
        };
        submitStats: LcSubmitStats;
      } | null;
      userContestRanking: LcContestRanking | null;
    }>(
      GRAPHQL,
      `query userProfile($username: String!) {
        matchedUser(username: $username) {
          username
          profile {
            realName
            userSlug
            userAvatar
            aboutMe
            ranking
            reputation
            solutionCount
            contestCount
            starRating
            websites
          }
          submitStats {
            acSubmissionNum { difficulty count }
          }
        }
        userContestRanking(username: $username) {
          rating
          globalRanking
          totalParticipants
          attendedContestsCount
        }
      }`,
      { username: handle },
    );

    const user = data.matchedUser;
    if (!user) throw new HandleNotFoundError("LeetCode", handle);

    const difficultyMap = new Map(
      (user.submitStats?.acSubmissionNum ?? []).map((d) => [d.difficulty, d.count]),
    );
    const easy = difficultyMap.get("Easy") ?? null;
    const medium = difficultyMap.get("Medium") ?? null;
    const hard = difficultyMap.get("Hard") ?? null;
    const solvedTotal =
      difficultyMap.get("All") ??
      (easy !== null || medium !== null || hard !== null
        ? (easy ?? 0) + (medium ?? 0) + (hard ?? 0)
        : null);

    const profile = user.profile;
    const contest = data.userContestRanking;
    const contestRating = contest?.rating != null ? Math.round(contest.rating) : null;

    const identityText = [
      profile?.realName,
      profile?.userSlug,
      profile?.aboutMe,
      ...(profile?.websites ?? []),
    ].filter((v): v is string => typeof v === "string" && v.length > 0);

    return {
      handle: user.username,
      displayName: profile?.realName || profile?.userSlug || null,
      avatarUrl: profile?.userAvatar ?? null,
      rating: contestRating,
      maxRating: null,
      rank: profile?.ranking != null ? `Global rank #${profile.ranking.toLocaleString("en-IN")}` : null,
      globalRank: profile?.ranking ?? null,
      problemsSolved: solvedTotal,
      contestsAttended:
        contest?.attendedContestsCount ?? profile?.contestCount ?? null,
      contestsTotal: null,
      reputation: profile?.reputation ?? null,
      organization: null,
      titlePhoto: profile?.userAvatar ?? null,
      lastContestAt: null,
      streakDays: null,
      identityText,
      raw: {
        profile: {
          ranking: profile?.ranking ?? null,
          reputation: profile?.reputation ?? null,
          solutionCount: profile?.solutionCount ?? null,
          contestCount: profile?.contestCount ?? null,
          starRating: profile?.starRating ?? null,
        },
        contest: {
          rating: contest?.rating ?? null,
          globalRanking: contest?.globalRanking ?? null,
          totalParticipants: contest?.totalParticipants ?? null,
          attendedContestsCount: contest?.attendedContestsCount ?? null,
        },
        solutionsByDifficulty: { easy, medium, hard, all: solvedTotal },
      },
    };
  },

  async fetchRatingHistory(handle: string): Promise<RatingPoint[]> {
    const data = await fetchGraphQL<{ userContestRankingHistory: LcHistoryEntry[] | null }>(
      GRAPHQL,
      `query userContestRankingHistory($username: String!) {
        userContestRankingHistory(username: $username) {
          rating
          ranking
          attended
          contest { title titleSlug startTime duration }
        }
      }`,
      { username: handle },
    );

    const history = (data.userContestRankingHistory ?? [])
      .filter((entry) => entry.attended !== false && entry.contest)
      .sort((a, b) => a.contest!.startTime - b.contest!.startTime);

    let previous: number | null = null;

    return history.map((entry) => {
      const contest = entry.contest!;
      const ratingAfter = entry.rating != null ? Math.round(entry.rating) : null;
      const ratingBefore = previous;
      const delta =
        ratingBefore !== null && ratingAfter !== null ? ratingAfter - ratingBefore : null;
      if (ratingAfter !== null) previous = ratingAfter;

      return {
        contestName: contest.title,
        externalId: `${handle}:${contest.titleSlug}`,
        rank: entry.ranking ?? null,
        ratingBefore,
        ratingAfter,
        delta,
        participatedAt: new Date(contest.startTime * 1000),
      };
    });
  },

  async fetchContests(): Promise<RemoteContest[]> {
    const data = await fetchGraphQL<{
      upcomingContests: LcContest[];
      pastContests?: { data: LcContest[] };
    }>(
      GRAPHQL,
      `query {
        upcomingContests { title titleSlug startTime duration }
        pastContests(pageNo: 1, numPerPage: 25) { data { title titleSlug startTime duration } }
      }`,
      {},
    );

    const all = [
      ...(data.upcomingContests ?? []),
      ...((data.pastContests?.data ?? []).filter(Boolean) as LcContest[]),
    ];
    const now = Date.now();
    const horizon = now + 1000 * 60 * 60 * 24 * 200;

    return all
      .filter((c) => {
        const start = c.startTime * 1000;
        return start > now - 1000 * 60 * 60 * 24 * 21 && start < horizon;
      })
      .map((c) => ({
        externalId: c.titleSlug,
        name: c.title,
        url: `https://leetcode.com/contest/${c.titleSlug}/`,
        startTime: new Date(c.startTime * 1000),
        endTime: new Date((c.startTime + c.duration) * 1000),
        durationMinutes: Math.round(c.duration / 60),
        registrationDeadline: null,
        type: c.titleSlug.startsWith("weekly")
          ? "WEEKLY"
          : c.titleSlug.startsWith("biweekly")
            ? "BIWEEKLY"
            : null,
        participantCount: null,
        description: null,
      }));
  },
};
