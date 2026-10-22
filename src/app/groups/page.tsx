import Link from "next/link";
import { redirect } from "next/navigation";
import { Flag, Lock, Plus, Users } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Avatar } from "@/components/avatar";
import { EmptyState, PageHeader, SectionTitle } from "@/components/ui";
import {
  createChallengeAction,
  createGroupAction,
  joinGroupAction,
} from "@/lib/actions/community";
import { ActionForm } from "@/components/action-form";

export const metadata = { title: "Groups" };

// This route depends on request-time session data, so it renders per request.
export const instant = false;

export default async function GroupsPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const groups = await prisma.group.findMany({
    include: {
      members: { include: { user: { select: { id: true, displayName: true, avatarUrl: true } } } },
      challenges: { orderBy: { endsAt: "desc" } },
      college: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const myGroups = groups.filter((g) => g.members.some((m) => m.userId === session.id));
  const openGroups = groups.filter((g) => !g.isPrivate && !myGroups.some((m) => m.id === g.id));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="Communities"
        title="Groups and challenges"
        description="Private friend groups, batch squads and class challenges. Set a shared target and watch everyone climb together."
      />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <section className="card p-5">
            <SectionTitle title={`Your groups · ${myGroups.length}`} />
            {myGroups.length === 0 ? (
              <EmptyState
                title="You have not joined a group"
                description="Create a group for your batch or join one with a code."
                icon={<Users className="h-5 w-5" />}
              />
            ) : (
              <div className="space-y-4">
                {myGroups.map((group) => (
                  <article
                    key={group.id}
                    className="rounded-xl border border-line bg-surface-2 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="flex items-center gap-2 font-semibold text-ink">
                          {group.name}
                          {group.isPrivate ? (
                            <Lock className="h-3.5 w-3.5 text-ink-faint" />
                          ) : null}
                        </h3>
                        {group.description ? (
                          <p className="mt-0.5 text-xs text-ink-muted">{group.description}</p>
                        ) : null}
                        <p className="mt-1 text-[0.68rem] text-ink-faint">
                          Join code <span className="font-mono text-ink-muted">{group.joinCode}</span>
                          {group.college ? ` · ${group.college.name}` : ""}
                        </p>
                      </div>
                      <span className="chip">
                        {group.members.length} member{group.members.length === 1 ? "" : "s"}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {group.members.slice(0, 8).map((member) => (
                        <Link
                          key={member.id}
                          href={`/u/${member.user.id}`}
                          className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-2 py-1 text-xs text-ink-muted transition hover:border-brand/40 hover:text-ink"
                        >
                          <Avatar name={member.user.displayName} src={member.user.avatarUrl} size={18} />
                          {member.user.displayName}
                        </Link>
                      ))}
                    </div>

                    {group.challenges.length ? (
                      <ul className="mt-4 space-y-2 border-t border-line pt-3">
                        {group.challenges.map((challenge) => {
                          const ended = new Date(challenge.endsAt).getTime() < Date.now();
                          return (
                            <li
                              key={challenge.id}
                              className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2"
                            >
                              <Flag className="h-3.5 w-3.5 text-class-s" />
                              <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink">
                                {challenge.title}
                              </span>
                              <span className="text-[0.68rem] text-ink-faint">
                                {challenge.metric.replace(/_/g, " ").toLowerCase()} · target{" "}
                                {challenge.target}
                              </span>
                              <span
                                className={`chip ${
                                  ended ? "opacity-60" : "border-class-s/40 bg-class-s/10 text-class-s"
                                }`}
                              >
                                {ended
                                  ? "Ended"
                                  : `Ends ${new Date(challenge.endsAt).toLocaleDateString("en-IN")}`}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}

                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs text-brand-bright">
                        Start a group challenge
                      </summary>
                      <ActionForm action={createChallengeAction} className="mt-3 space-y-3">
                        <input type="hidden" name="groupId" value={group.id} />
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="label" htmlFor={`title-${group.id}`}>
                              Title
                            </label>
                            <input
                              id={`title-${group.id}`}
                              name="title"
                              required
                              className="input"
                              placeholder="Two contests this week"
                            />
                          </div>
                          <div>
                            <label className="label" htmlFor={`metric-${group.id}`}>
                              Metric
                            </label>
                            <select
                              id={`metric-${group.id}`}
                              name="metric"
                              className="input"
                              defaultValue="CONTESTS"
                            >
                              <option value="CONTESTS">Contests attended</option>
                              <option value="PROBLEMS">Problems solved</option>
                              <option value="RATING_GAIN">Rating gained</option>
                              <option value="CLASS">Class tier</option>
                            </select>
                          </div>
                          <div>
                            <label className="label" htmlFor={`target-${group.id}`}>
                              Target
                            </label>
                            <input
                              id={`target-${group.id}`}
                              name="target"
                              type="number"
                              min={1}
                              defaultValue={2}
                              className="input"
                            />
                          </div>
                          <div>
                            <label className="label" htmlFor={`days-${group.id}`}>
                              Duration (days)
                            </label>
                            <input
                              id={`days-${group.id}`}
                              name="days"
                              type="number"
                              min={1}
                              max={60}
                              defaultValue={7}
                              className="input"
                            />
                          </div>
                        </div>
                        <button type="submit" className="btn btn-primary">
                          <Plus className="h-4 w-4" />
                          Create challenge
                        </button>
                      </ActionForm>
                    </details>
                  </article>
                ))}
              </div>
            )}
          </section>

          {openGroups.length ? (
            <section className="card p-5">
              <SectionTitle title="Open groups" hint="Visible to everyone" />
              <ul className="space-y-2.5">
                {openGroups.map((group) => (
                  <li
                    key={group.id}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface-2 px-3.5 py-3"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-ink">{group.name}</span>
                      <span className="block text-xs text-ink-faint">
                        {group.members.length} member{group.members.length === 1 ? "" : "s"}
                        {group.college ? ` · ${group.college.name}` : ""}
                      </span>
                    </span>
                    <span className="font-mono text-[0.68rem] text-ink-faint">
                      {group.joinCode}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <div className="space-y-5">
          <section className="card p-5">
            <SectionTitle title="Create a group" />
            <ActionForm action={createGroupAction} className="space-y-3">
              <div>
                <label className="label" htmlFor="group-name">
                  Name
                </label>
                <input
                  id="group-name"
                  name="name"
                  required
                  minLength={3}
                  className="input"
                  placeholder="CSE Batch 2027"
                />
              </div>
              <div>
                <label className="label" htmlFor="group-description">
                  Description
                </label>
                <textarea
                  id="group-description"
                  name="description"
                  rows={3}
                  className="input resize-none"
                  placeholder="Weekly rated contests, same team."
                />
              </div>
              <div className="flex items-center gap-2">
                <input id="group-private" name="isPrivate" type="checkbox" defaultChecked />
                <label htmlFor="group-private" className="text-sm text-ink-muted">
                  Private (join with a code only)
                </label>
              </div>
              <button type="submit" className="btn btn-primary">
                <Plus className="h-4 w-4" />
                Create group
              </button>
            </ActionForm>
          </section>

          <section className="card p-5">
            <SectionTitle title="Join with a code" />
            <ActionForm action={joinGroupAction} className="space-y-3">
              <div>
                <label className="label" htmlFor="joinCode">
                  Group code
                </label>
                <input
                  id="joinCode"
                  name="joinCode"
                  required
                  className="input font-mono uppercase"
                  placeholder="ABCD1234"
                />
              </div>
              <button type="submit" className="btn btn-secondary">
                Join group
              </button>
            </ActionForm>
          </section>
        </div>
      </div>
    </div>
  );
}
