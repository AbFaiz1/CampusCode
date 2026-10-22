import type { Platform } from "@/lib/constants";

export type RatingPoint = {
  contestName: string;
  externalId: string;
  rank: number | null;
  ratingBefore: number | null;
  ratingAfter: number | null;
  delta: number | null;
  participatedAt: Date;
};

export type PlatformProfile = {
  handle: string;
  /** Display name as shown by the platform (used for verification-code matching). */
  displayName: string | null;
  avatarUrl: string | null;
  /** Current contest rating, or null when the platform does not expose one. */
  rating: number | null;
  maxRating: number | null;
  /** Human readable band, e.g. "specialist", "Candidate Master". */
  rank: string | null;
  /** Numeric position among all users of the platform. */
  globalRank: number | null;
  problemsSolved: number | null;
  contestsAttended: number | null;
  contestsTotal: number | null;
  reputation: number | null;
  organization: string | null;
  titlePhoto: string | null;
  lastContestAt: Date | null;
  streakDays: number | null;
  /**
   * Free-text identity fields (names, organisation, bio). A verification code
   * placed in any of these proves the student controls the account.
   */
  identityText: string[];
  raw?: Record<string, unknown>;
};

export type RemoteContest = {
  externalId: string;
  name: string;
  url: string;
  startTime: Date;
  endTime: Date;
  durationMinutes: number | null;
  registrationDeadline: Date | null;
  type: string | null;
  participantCount: number | null;
  description: string | null;
};

export type PlatformAdapter = {
  platform: Platform;
  /** Whether the platform exposes a numeric rating at all. */
  exposesRating: boolean;
  fetchProfile(handle: string): Promise<PlatformProfile>;
  fetchRatingHistory(handle: string): Promise<RatingPoint[]>;
  fetchContests(): Promise<RemoteContest[]>;
};

/** Thrown when a handle does not exist on the platform. */
export class HandleNotFoundError extends Error {
  constructor(platform: string, handle: string) {
    super(`No ${platform} account found for "${handle}"`);
    this.name = "HandleNotFoundError";
  }
}
