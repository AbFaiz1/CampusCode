"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Medal, Trophy, Users } from "lucide-react";
import { PLATFORM_LABELS, type Platform } from "@/lib/constants";
import { classHex } from "@/lib/class-styles";
import { Avatar } from "@/components/avatar";
import { PlatformIcon, RatingValue } from "@/components/platform-icon";
import { EmptyState } from "@/components/ui";

type College = {
  id: string;
  name: string;
  departments: {
    id: string;
    name: string;
    courses: { id: string; name: string; shortName: string | null }[];
  }[];
};

type Row = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  campusScore: number;
  campusClass: string;
  activityLevel: string;
  batch: string | null;
  academicYear: number | null;
  college: { id: string; name: string } | null;
  department: { id: string; name: string } | null;
  course: { id: string; name: string; shortName: string | null } | null;
  platformRatings: Partial<Record<Platform, number>>;
  rank?: number;
};

const SCOPES = [
  { id: "college", label: "College" },
  { id: "department", label: "Department" },
  { id: "course", label: "Course" },
  { id: "year", label: "Academic year" },
  { id: "batch", label: "Batch" },
  { id: "friends", label: "Friends" },
  { id: "platform", label: "Platform" },
  { id: "class", label: "Class" },
] as const;

type ScopeId = (typeof SCOPES)[number]["id"];

export function LeaderboardExplorer({
  colleges,
  years,
  batches,
  signedIn,
}: {
  colleges: College[];
  years: number[];
  batches: string[];
  signedIn: boolean;
}) {
  const [scope, setScope] = useState<ScopeId>("college");
  const [collegeId, setCollegeId] = useState(colleges[0]?.id ?? "");
  const [departmentId, setDepartmentId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [batch, setBatch] = useState("");
  const [platform, setPlatform] = useState<Platform>("CODEFORCES");
  const [classFilter, setClassFilter] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [metric, setMetric] = useState("CampusCode score");
  const [loading, setLoading] = useState(true);

  const college = colleges.find((c) => c.id === collegeId) ?? null;
  const departments = college?.departments ?? [];
  const department = departments.find((d) => d.id === departmentId) ?? null;
  const courses = department?.courses ?? [];

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ scope });
    if (collegeId) params.set("collegeId", collegeId);
    if (departmentId) params.set("departmentId", departmentId);
    if (courseId) params.set("courseId", courseId);
    if (academicYear) params.set("academicYear", academicYear);
    if (batch) params.set("batch", batch);
    if (scope === "platform") params.set("platform", platform);
    if (classFilter) params.set("class", classFilter);
    params.set("limit", "200");

    try {
      const res = await fetch(`/api/leaderboard?${params.toString()}`);
      const data = (await res.json()) as { entries: Row[]; metric: string };
      setRows(data.entries ?? []);
      setMetric(data.metric ?? "CampusCode score");
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [scope, collegeId, departmentId, courseId, academicYear, batch, platform, classFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <div className="grid gap-5 lg:grid-cols-[19rem_1fr]">
      <aside className="card h-fit p-4 lg:sticky lg:top-24">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">
          Leaderboard
        </p>

        <div className="grid grid-cols-2 gap-1.5">
          {SCOPES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setScope(s.id)}
              disabled={s.id === "friends" && !signedIn}
              className={`rounded-lg border px-2.5 py-2 text-xs font-medium transition ${
                scope === s.id
                  ? "border-brand/50 bg-brand/12 text-brand-bright"
                  : "border-line bg-surface-2 text-ink-muted hover:border-brand/35 hover:text-ink"
              } disabled:cursor-not-allowed disabled:opacity-40`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3.5 border-t border-line pt-4">
          {scope === "college" || scope === "department" || scope === "course" ? (
            <div>
              <label className="label" htmlFor="lb-college">
                College
              </label>
              <select
                id="lb-college"
                className="input"
                value={collegeId}
                onChange={(e) => {
                  setCollegeId(e.target.value);
                  setDepartmentId("");
                  setCourseId("");
                }}
              >
                <option value="">All colleges</option>
                {colleges.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {(scope === "department" || scope === "course") && (
            <div>
              <label className="label" htmlFor="lb-department">
                Department
              </label>
              <select
                id="lb-department"
                className="input"
                value={departmentId}
                disabled={!college}
                onChange={(e) => {
                  setDepartmentId(e.target.value);
                  setCourseId("");
                }}
              >
                <option value="">{college ? "All departments" : "Pick a college"}</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {scope === "course" && (
            <div>
              <label className="label" htmlFor="lb-course">
                Course
              </label>
              <select
                id="lb-course"
                className="input"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
              >
                <option value="">All courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {scope === "year" && (
            <div>
              <label className="label" htmlFor="lb-year">
                Academic year
              </label>
              <select
                id="lb-year"
                className="input"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
              >
                <option value="">All years</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    Year {y}
                  </option>
                ))}
              </select>
            </div>
          )}

          {scope === "batch" && (
            <div>
              <label className="label" htmlFor="lb-batch">
                Graduation batch
              </label>
              <select
                id="lb-batch"
                className="input"
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
              >
                <option value="">All batches</option>
                {batches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          )}

          {scope === "platform" && (
            <div>
              <label className="label" htmlFor="lb-platform">
                Platform
              </label>
              <select
                id="lb-platform"
                className="input"
                value={platform}
                onChange={(e) => setPlatform(e.target.value as Platform)}
              >
                {(["CODEFORCES", "LEETCODE", "CODECHEF", "ATCODER"] as Platform[]).map((p) => (
                  <option key={p} value={p}>
                    {PLATFORM_LABELS[p]}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-ink-faint">
                {platform === "LEETCODE"
                  ? "LeetCode does not publish a rating number, so this board ranks by global contest position."
                  : `Ranked by ${PLATFORM_LABELS[platform]} rating.`}
              </p>
            </div>
          )}

          {scope === "class" && (
            <div>
              <label className="label" htmlFor="lb-class">
                Class
              </label>
              <select
                id="lb-class"
                className="input"
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
              >
                <option value="">All classes</option>
                {["S", "A", "B", "C"].map((c) => (
                  <option key={c} value={c}>
                    Class {c}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </aside>

      <div className="min-w-0">
        <div className="card mb-4 flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <p className="flex items-center gap-2 text-sm text-ink-muted">
            <Trophy className="h-4 w-4 text-class-s" />
            Ranked by{" "}
            <span className="font-semibold text-ink">{metric}</span>
          </p>
          <span className="font-mono text-xs text-ink-faint">
            {loading ? "loading…" : `${rows.length} ranked`}
          </span>
        </div>

        {rows.length === 0 && !loading ? (
          <EmptyState
            title={
              scope === "friends"
                ? "No friends on the board yet"
                : "No one matches this leaderboard yet"
            }
            description={
              scope === "friends"
                ? "Accept a few friend requests and your private league appears here."
                : "Once students in this group join and verify their platforms, they show up here."
            }
            icon={<Users className="h-5 w-5" />}
          />
        ) : (
          <div className="card overflow-hidden">
            <div className="hidden grid-cols-[3rem_1fr_9rem_10rem] gap-3 border-b border-line bg-surface-2 px-4 py-2.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-ink-faint md:grid">
              <span>#</span>
              <span>Student</span>
              <span>Details</span>
              <span className="text-right">{metric}</span>
            </div>
            <div className="divide-y divide-line-soft">
              {rows.map((row) => (
                <Link
                  key={row.id}
                  href={`/u/${row.id}`}
                  className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 px-4 py-3 transition hover:bg-surface-2 md:grid-cols-[3rem_1fr_9rem_10rem]"
                >
                  <span className="font-mono text-sm text-ink-faint">{row.rank}</span>

                  <span className="flex min-w-0 items-center gap-3">
                    <Avatar name={row.displayName} src={row.avatarUrl} size={36} />
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-medium text-ink">{row.displayName}</span>
                        <span
                          className="inline-flex h-5 w-5 items-center justify-center rounded-md border font-mono text-[0.6rem] font-bold"
                          style={{
                            color: classHex(row.campusClass),
                            borderColor: `color-mix(in oklab, ${classHex(row.campusClass)} 40%, transparent)`,
                            backgroundColor: `color-mix(in oklab, ${classHex(row.campusClass)} 12%, transparent)`,
                          }}
                        >
                          {row.campusClass}
                        </span>
                      </span>
                      <span className="block truncate text-xs text-ink-faint">
                        {[row.course?.shortName ?? row.course?.name, row.department?.name]
                          .filter(Boolean)
                          .join(" · ") || "Student"}
                      </span>
                    </span>
                  </span>

                  <span className="hidden text-xs text-ink-faint md:block">
                    {[row.batch && `Batch ${row.batch}`, row.academicYear && `Year ${row.academicYear}`]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </span>

                  <span className="text-right">
                    {scope === "platform" ? (
                      <span className="flex items-center justify-end gap-1.5">
                        <PlatformIcon platform={platform} className="h-5 w-5" />
                        <RatingValue platform={platform} rating={row.platformRatings[platform] ?? null} />
                      </span>
                    ) : (
                      <span className="font-mono text-base font-semibold text-ink">
                        {Math.round(row.campusScore)}
                      </span>
                    )}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-ink-faint">
          <Medal className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {scope === "platform"
            ? "Platform boards use that platform's own rating and never mix scales."
            : "CampusCode boards use our documented 0-1000 score. Only students who opted into the public directory appear."}
        </p>
      </div>
    </div>
  );
}
