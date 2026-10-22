"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  changePasswordAction,
  deleteAccountAction,
  updatePrivacyAction,
  updateProfileAction,
  type ActionState,
} from "@/lib/actions/profile";

function Submit({ label, className = "btn btn-primary" }: { label: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? "Saving…" : label}
    </button>
  );
}

function Status({ state }: { state: ActionState }) {
  if (!state?.message) return null;
  return (
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
  );
}

type College = {
  id: string;
  name: string;
  departments: { id: string; name: string; courses: { id: string; name: string }[] }[];
};

export function ProfileForm({
  user,
  colleges,
}: {
  user: {
    displayName: string;
    bio: string | null;
    avatarUrl: string | null;
    collegeId: string | null;
    departmentId: string | null;
    courseId: string | null;
    academicYear: number | null;
    batch: string | null;
    graduationYear: number | null;
    codingInterests: string | null;
    timezone: string;
  };
  colleges: College[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(updateProfileAction, null);
  const [collegeId, setCollegeId] = useState(user.collegeId ?? "");
  const [departmentId, setDepartmentId] = useState(user.departmentId ?? "");
  const [courseId, setCourseId] = useState(user.courseId ?? "");

  const college = colleges.find((c) => c.id === collegeId) ?? null;
  const departments = college?.departments ?? [];
  const department = departments.find((d) => d.id === departmentId) ?? null;
  const courses = department?.courses ?? [];

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="collegeId" value={collegeId} />
      <input type="hidden" name="departmentId" value={departmentId} />
      <input type="hidden" name="courseId" value={courseId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="displayName">
            Display name
          </label>
          <input
            id="displayName"
            name="displayName"
            required
            defaultValue={user.displayName}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="avatarUrl">
            Avatar URL
          </label>
          <input
            id="avatarUrl"
            name="avatarUrl"
            defaultValue={user.avatarUrl ?? ""}
            className="input"
            placeholder="https://…"
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="bio">
          Bio
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={3}
          maxLength={500}
          defaultValue={user.bio ?? ""}
          className="input resize-none"
          placeholder="What are you working on this semester?"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="college-select">
            College
          </label>
          <select
            id="college-select"
            className="input"
            value={collegeId}
            onChange={(e) => {
              setCollegeId(e.target.value);
              setDepartmentId("");
              setCourseId("");
            }}
          >
            <option value="">Select college</option>
            {colleges.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="department-select">
            Department
          </label>
          <select
            id="department-select"
            className="input"
            value={departmentId}
            disabled={!college}
            onChange={(e) => {
              setDepartmentId(e.target.value);
              setCourseId("");
            }}
          >
            <option value="">{college ? "Select department" : "Pick a college"}</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="course-select">
            Course
          </label>
          <select
            id="course-select"
            className="input"
            value={courseId}
            disabled={!department}
            onChange={(e) => setCourseId(e.target.value)}
          >
            <option value="">{department ? "Select course" : "Pick a department"}</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="academicYear">
            Academic year
          </label>
          <select
            id="academicYear"
            name="academicYear"
            className="input"
            defaultValue={user.academicYear ?? ""}
          >
            <option value="">Select</option>
            {[1, 2, 3, 4, 5].map((y) => (
              <option key={y} value={y}>
                Year {y}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="batch">
            Batch
          </label>
          <input
            id="batch"
            name="batch"
            defaultValue={user.batch ?? ""}
            className="input"
            placeholder="2027"
          />
        </div>
        <div>
          <label className="label" htmlFor="graduationYear">
            Graduation year
          </label>
          <input
            id="graduationYear"
            name="graduationYear"
            type="number"
            min={2000}
            max={2100}
            defaultValue={user.graduationYear ?? ""}
            className="input"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="codingInterests">
            Coding interests
          </label>
          <input
            id="codingInterests"
            name="codingInterests"
            defaultValue={user.codingInterests ?? ""}
            className="input"
            placeholder="DP, graphs, CP"
          />
        </div>
        <div>
          <label className="label" htmlFor="timezone">
            Timezone
          </label>
          <input
            id="timezone"
            name="timezone"
            defaultValue={user.timezone}
            className="input"
            placeholder="Asia/Kolkata"
          />
        </div>
      </div>

      <Status state={state} />
      <Submit label="Save profile" />
    </form>
  );
}

const PRIVACY_FIELDS = [
  { name: "isPublic", label: "Public profile", hint: "Anyone with the link can open your coding dashboard." },
  { name: "showInDirectory", label: "Appear in the directory and leaderboards", hint: "Turn this off to stay completely out of rankings." },
  { name: "showRatings", label: "Show ratings and class", hint: "Hide your numbers from other students." },
  { name: "showPlatforms", label: "Show linked platforms", hint: "Display which platforms you are on." },
  { name: "showEmail", label: "Show my email", hint: "Off by default — nobody needs it." },
] as const;

export function PrivacyForm({
  values,
}: {
  values: Record<(typeof PRIVACY_FIELDS)[number]["name"], boolean>;
}) {
  const [state, action] = useActionState<ActionState, FormData>(updatePrivacyAction, null);

  return (
    <form action={action} className="space-y-3">
      {PRIVACY_FIELDS.map((field) => (
        <label
          key={field.name}
          className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3"
        >
          <input
            type="checkbox"
            name={field.name}
            defaultChecked={values[field.name]}
            className="mt-1 h-4 w-4 accent-[var(--color-brand)]"
          />
          <span>
            <span className="block text-sm font-medium text-ink">{field.label}</span>
            <span className="block text-xs text-ink-faint">{field.hint}</span>
          </span>
        </label>
      ))}
      <Status state={state} />
      <Submit label="Save privacy settings" />
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState<ActionState, FormData>(changePasswordAction, null);

  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="currentPassword">
            Current password
          </label>
          <input
            id="currentPassword"
            name="currentPassword"
            type="password"
            required
            autoComplete="current-password"
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="newPassword">
            New password
          </label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="input"
          />
        </div>
      </div>
      <Status state={state} />
      <Submit label="Change password" className="btn btn-secondary" />
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action] = useActionState<ActionState, FormData>(deleteAccountAction, null);
  const [confirm, setConfirm] = useState("");

  return (
    <form action={action} className="space-y-3">
      <div className="max-w-sm">
        <label className="label" htmlFor="confirm">
          Type DELETE to confirm
        </label>
        <input
          id="confirm"
          name="confirm"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="input font-mono"
          placeholder="DELETE"
        />
      </div>
      {state?.message ? <Status state={state} /> : null}
      <Submit
        label="Delete my account"
        className="btn btn-danger disabled:cursor-not-allowed disabled:opacity-40"
      />
    </form>
  );
}
