"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, SlidersHorizontal, X } from "lucide-react";
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

type Entry = {
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
  platforms: { platform: Platform; rating: number | null; verified: boolean }[];
};

const CLASS_OPTIONS = ["S", "A", "B", "C"];

export function DirectoryBrowser({
  colleges,
  years,
  batches,
  initialCollegeId,
}: {
  colleges: College[];
  years: number[];
  batches: string[];
  initialCollegeId?: string | null;
}) {
  const [collegeId, setCollegeId] = useState(initialCollegeId ?? "");
  const [departmentId, setDepartmentId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [batch, setBatch] = useState("");
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [sort, setSort] = useState("score");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const college = useMemo(
    () => colleges.find((c) => c.id === collegeId) ?? null,
    [colleges, collegeId],
  );
  const departments = college?.departments ?? [];
  const department = departments.find((d) => d.id === departmentId) ?? null;
  const courses = department?.courses ?? [];

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (collegeId) params.set("collegeId", collegeId);
    if (departmentId) params.set("departmentId", departmentId);
    if (courseId) params.set("courseId", courseId);
    if (academicYear) params.set("academicYear", academicYear);
    if (batch) params.set("batch", batch);
    if (search.trim()) params.set("search", search.trim());
    if (classFilter) params.set("class", classFilter);
    params.set("sort", sort);
    params.set("limit", "100");

    try {
      const res = await fetch(`/api/directory?${params.toString()}`);
      const data = (await res.json()) as { entries: Entry[]; total: number };
      setEntries(data.entries ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setEntries([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [collegeId, departmentId, courseId, academicYear, batch, search, classFilter, sort]);

  useEffect(() => {
    const timer = setTimeout(load, search ? 260 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  const hasFilters = Boolean(
    collegeId || departmentId || courseId || academicYear || batch || search || classFilter,
  );

  const reset = () => {
    setCollegeId("");
    setDepartmentId("");
    setCourseId("");
    setAcademicYear("");
    setBatch("");
    setSearch("");
    setClassFilter("");
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[19rem_1fr]">
      <aside className="card h-fit p-4 lg:sticky lg:top-24">
        <div className="mb-3 flex items-center justify-between">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
          </p>
          {hasFilters ? (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1 text-xs text-ink-faint hover:text-ink"
            >
              <X className="h-3 w-3" /> Clear
            </button>
          ) : null}
        </div>

        <div className="space-y-3.5">
          <div>
            <label className="label" htmlFor="f-college">
              College
            </label>
            <select
              id="f-college"
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

          <div>
            <label className="label" htmlFor="f-department">
              Department / Branch
            </label>
            <select
              id="f-department"
              className="input"
              value={departmentId}
              disabled={!college}
              onChange={(e) => {
                setDepartmentId(e.target.value);
                setCourseId("");
              }}
            >
              <option value="">{college ? "All departments" : "Pick a college first"}</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="f-course">
              Course
            </label>
            <select
              id="f-course"
              className="input"
              value={courseId}
              disabled={!departmentId}
              onChange={(e) => setCourseId(e.target.value)}
            >
              <option value="">
                {departmentId ? "All courses" : "Pick a department first"}
              </option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="f-year">
                Year
              </label>
              <select
                id="f-year"
                className="input"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
              >
                <option value="">All</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    Year {y}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="f-batch">
                Batch
              </label>
              <select
                id="f-batch"
                className="input"
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
              >
                <option value="">All</option>
                {batches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="f-class">
              Class
            </label>
            <select
              id="f-class"
              className="input"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
            >
              <option value="">All classes</option>
              {CLASS_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  Class {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="f-sort">
              Sort by
            </label>
            <select
              id="f-sort"
              className="input"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="score">CampusCode score</option>
              <option value="class">Class</option>
              <option value="name">Name</option>
              <option value="recent">Recent activity</option>
              <option value="CODEFORCES">Codeforces rating</option>
              <option value="LEETCODE">LeetCode rank</option>
              <option value="CODECHEF">CodeChef rating</option>
              <option value="ATCODER">AtCoder rating</option>
            </select>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <div className="card mb-4 flex items-center gap-3 px-4 py-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <input
              className="input pl-9"
              placeholder="Search by student name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search students by name"
            />
          </div>
          <span className="hidden shrink-0 font-mono text-xs text-ink-faint sm:block">
            {loading ? "loading…" : `${total} student${total === 1 ? "" : "s"}`}
          </span>
        </div>

        {entries.length === 0 && !loading ? (
          <EmptyState
            title="No students match these filters"
            description="Try widening the department, course or year — or share CampusCode with your batch."
          />
        ) : (
          <div className="card divide-y divide-line-soft overflow-hidden">
            {entries.map((entry) => (
              <Link
                key={entry.id}
                href={`/u/${entry.id}`}
                className="flex flex-wrap items-center gap-3 px-4 py-3.5 transition hover:bg-surface-2"
              >
                <Avatar name={entry.displayName} src={entry.avatarUrl} size={42} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium text-ink">{entry.displayName}</span>
                    <span
                      className="inline-flex h-5 items-center rounded-md border px-1.5 font-mono text-[0.62rem] font-bold"
                      style={{
                        color: classHex(entry.campusClass),
                        borderColor: `color-mix(in oklab, ${classHex(entry.campusClass)} 40%, transparent)`,
                        backgroundColor: `color-mix(in oklab, ${classHex(entry.campusClass)} 12%, transparent)`,
                      }}
                    >
                      {entry.campusClass}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-ink-faint">
                    {[entry.course?.shortName ?? entry.course?.name, entry.department?.name]
                      .filter(Boolean)
                      .join(" · ") || "Department not set"}
                    {entry.batch ? ` · Batch ${entry.batch}` : ""}
                    {entry.academicYear ? ` · Year ${entry.academicYear}` : ""}
                  </span>
                </span>

                <span className="flex items-center gap-3 sm:gap-4">
                  <span className="hidden items-center gap-2 md:flex">
                    {entry.platforms.length === 0 ? (
                      <span className="text-[0.68rem] text-ink-faint">No platforms linked</span>
                    ) : (
                      entry.platforms.map((p) => (
                        <span
                          key={p.platform}
                          className="flex items-center gap-1"
                          title={`${PLATFORM_LABELS[p.platform]}${p.verified ? "" : " (unverified)"}`}
                        >
                          <PlatformIcon platform={p.platform} className="h-5 w-5" />
                          <RatingValue platform={p.platform} rating={p.rating} size="sm" />
                        </span>
                      ))
                    )}
                  </span>

                  <span className="text-right">
                    <span className="block font-mono text-base font-semibold text-ink">
                      {Math.round(entry.campusScore)}
                    </span>
                    <span className="block text-[0.62rem] uppercase tracking-wide text-ink-faint">
                      score
                    </span>
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
