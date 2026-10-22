import "server-only";

import type { Platform } from "@/lib/constants";
import { atcoderAdapter } from "./atcoder";
import { codechefAdapter } from "./codechef";
import { codeforcesAdapter } from "./codeforces";
import { leetcodeAdapter } from "./leetcode";
import type { PlatformAdapter } from "./types";

export const ADAPTERS: Record<Platform, PlatformAdapter> = {
  CODEFORCES: codeforcesAdapter,
  LEETCODE: leetcodeAdapter,
  CODECHEF: codechefAdapter,
  ATCODER: atcoderAdapter,
};

export function adapterFor(platform: Platform): PlatformAdapter {
  return ADAPTERS[platform];
}

export * from "./types";
