"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Link2, RefreshCw, ShieldCheck, Trash2, Unlink } from "lucide-react";
import {
  linkAccountAction,
  syncAllAccountsAction,
  syncAccountAction,
  unlinkAccountAction,
  type ActionState,
} from "@/lib/actions/profile";
import { PLATFORM_LABELS, type Platform } from "@/lib/constants";
import { PlatformIcon } from "@/components/platform-icon";

type Account = {
  id: string;
  platform: string;
  handle: string;
  profileUrl: string;
  rating: number | null;
  maxRating: number | null;
  rank: string | null;
  problemsSolved: number | null;
  contestsAttended: number | null;
  verificationStatus: string;
  lastSyncedAt: string | null;
  syncStatus: string | null;
  syncError: string | null;
};

function LinkSubmit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? "Checking…" : "Link account"}
    </button>
  );
}

export function AccountManager({
  accounts,
  platforms,
  verificationCode,
}: {
  accounts: Account[];
  platforms: Platform[];
  verificationCode: string | null;
}) {
  const [state, action] = useActionState<ActionState, FormData>(linkAccountAction, null);
  const [platform, setPlatform] = useState<Platform>(platforms[0] ?? "CODEFORCES");

  return (
    <div className="space-y-5">
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-ink-faint">
          Your linked accounts
        </h3>

        {accounts.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-ink-muted">
            No accounts linked yet. Add one below to start earning a CampusCode score.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {accounts.map((account) => (
              <li
                key={account.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3"
              >
                <PlatformIcon platform={account.platform} className="h-9 w-9" />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <a
                      href={account.profileUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="truncate font-medium text-ink hover:text-brand-bright hover:underline"
                    >
                      {account.handle}
                    </a>
                    <span
                      className={`chip ${
                        account.verificationStatus === "VERIFIED"
                          ? "border-positive/40 bg-positive/10 text-positive"
                          : account.verificationStatus === "PENDING"
                            ? "border-warning/40 bg-warning/10 text-warning"
                            : ""
                      }`}
                    >
                      {account.verificationStatus.toLowerCase()}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-[0.7rem] text-ink-faint">
                    {PLATFORM_LABELS[account.platform as Platform] ?? account.platform}
                    {account.rank ? ` · ${account.rank}` : ""}
                    {account.lastSyncedAt
                      ? ` · synced ${new Date(account.lastSyncedAt).toLocaleString("en-IN")}`
                      : " · never synced"}
                  </span>
                  {account.syncError ? (
                    <span className="mt-0.5 block text-[0.7rem] text-danger">
                      Last sync failed: {account.syncError}
                    </span>
                  ) : null}
                </span>

                <span className="flex items-center gap-4 text-right">
                  <span>
                    <span className="block font-mono text-sm font-semibold text-ink">
                      {account.rating ?? "N/A"}
                    </span>
                    <span className="block text-[0.62rem] uppercase tracking-wide text-ink-faint">
                      rating
                    </span>
                  </span>
                  <span>
                    <span className="block font-mono text-sm font-semibold text-ink">
                      {account.maxRating ?? "N/A"}
                    </span>
                    <span className="block text-[0.62rem] uppercase tracking-wide text-ink-faint">
                      peak
                    </span>
                  </span>
                  <span>
                    <span className="block font-mono text-sm font-semibold text-ink">
                      {account.problemsSolved ?? "N/A"}
                    </span>
                    <span className="block text-[0.62rem] uppercase tracking-wide text-ink-faint">
                      solved
                    </span>
                  </span>
                </span>

                <span className="flex gap-1.5">
                  <form action={syncAccountAction}>
                    <input type="hidden" name="accountId" value={account.id} />
                    <button
                      type="submit"
                      className="btn btn-ghost px-2.5 py-1.5 text-xs"
                      title="Sync now"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Sync
                    </button>
                  </form>
                  <form action={unlinkAccountAction}>
                    <input type="hidden" name="accountId" value={account.id} />
                    <button
                      type="submit"
                      className="btn btn-ghost px-2.5 py-1.5 text-xs text-danger"
                      title="Unlink"
                    >
                      <Unlink className="h-3.5 w-3.5" />
                    </button>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        )}

        {accounts.length ? (
          <form action={syncAllAccountsAction} className="mt-3">
            <button type="submit" className="btn btn-secondary">
              <RefreshCw className="h-4 w-4" />
              Sync all accounts
            </button>
          </form>
        ) : null}
      </section>

      <section className="border-t border-line pt-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-ink-faint">
          Link a new platform
        </h3>

        <form action={action} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="platform">
                Platform
              </label>
              <select
                id="platform"
                name="platform"
                className="input"
                value={platform}
                onChange={(e) => setPlatform(e.target.value as Platform)}
              >
                {platforms.map((p) => (
                  <option key={p} value={p}>
                    {PLATFORM_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="handle">
                Handle
              </label>
              <input
                id="handle"
                name="handle"
                required
                className="input"
                placeholder="your_handle"
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="verificationCode">
              Verification code (optional but recommended)
            </label>
            <input
              id="verificationCode"
              name="verificationCode"
              className="input font-mono"
              placeholder={verificationCode ?? "CC-XXXXXX"}
            />
            <p className="mt-1.5 text-xs leading-relaxed text-ink-faint">
              <ShieldCheck className="mr-1 inline h-3.5 w-3.5 text-positive" />
              Put this code in your {PLATFORM_LABELS[platform]} display name or organisation
              field, then link or sync. We match it against the public profile to prove the
              account is yours — we never ask for your platform password.
            </p>
          </div>

          {state?.message ? (
            <p
              role="status"
              className={`rounded-lg border px-3 py-2 text-sm ${
                state.ok
                  ? "border-positive/40 bg-positive/10 text-positive"
                  : "border-danger/40 bg-danger/10 text-danger"
              }`}
            >
              {state.message}
            </p>
          ) : null}

          <LinkSubmit />
        </form>
      </section>

      <section className="border-t border-line pt-5">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-ink-faint">
          <Trash2 className="h-3.5 w-3.5" />
          Remove an account
        </h3>
        <p className="text-xs leading-relaxed text-ink-muted">
          Unlinking removes the stored statistics and rating history for that platform. Your
          CampusCode score is recalculated immediately afterwards. You can re-link at any time.
        </p>
        <span className="mt-2 inline-flex items-center gap-1.5 text-xs text-ink-faint">
          <Link2 className="h-3.5 w-3.5" />
          Use the unlink button on any account above.
        </span>
      </section>
    </div>
  );
}
