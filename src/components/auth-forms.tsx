"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction, signupAction, type AuthFormState } from "@/lib/actions/auth";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary w-full py-2.5" disabled={pending}>
      {pending ? "Please wait…" : label}
    </button>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState<AuthFormState, FormData>(loginAction, null);

  return (
    <form action={action} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {state?.error ? (
        <p
          role="alert"
          className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
        >
          {state.error}
        </p>
      ) : null}

      <div>
        <label className="label" htmlFor="email">
          College email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="input"
          placeholder="you@college.edu"
        />
      </div>

      <div>
        <label className="label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="input"
          placeholder="••••••••"
        />
      </div>

      <SubmitButton label="Log in" />
    </form>
  );
}

export function SignupForm({
  colleges,
}: {
  colleges: { id: string; name: string; departments: { id: string; name: string; courses: { id: string; name: string }[] }[] }[];
}) {
  const [state, action] = useActionState<AuthFormState, FormData>(signupAction, null);

  return (
    <form action={action} className="space-y-4">
      {state?.error ? (
        <p
          role="alert"
          className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
        >
          {state.error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="displayName">
            Display name
          </label>
          <input
            id="displayName"
            name="displayName"
            required
            className="input"
            placeholder="Aarav Sharma"
          />
          {state?.fieldErrors?.displayName ? (
            <p className="mt-1 text-xs text-danger">{state.fieldErrors.displayName}</p>
          ) : null}
        </div>

        <div>
          <label className="label" htmlFor="batch">
            Graduation batch
          </label>
          <input
            id="batch"
            name="batch"
            className="input"
            placeholder="2027"
            inputMode="numeric"
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="email">
          College email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="input"
          placeholder="you@college.edu"
        />
        {state?.fieldErrors?.email ? (
          <p className="mt-1 text-xs text-danger">{state.fieldErrors.email}</p>
        ) : null}
      </div>

      <div>
        <label className="label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="input"
          placeholder="At least 8 characters"
        />
        {state?.fieldErrors?.password ? (
          <p className="mt-1 text-xs text-danger">{state.fieldErrors.password}</p>
        ) : null}
      </div>

      <div>
        <label className="label" htmlFor="collegeId">
          College
        </label>
        <select id="collegeId" name="collegeId" className="input">
          <option value="">Select your college</option>
          {colleges.map((college) => (
            <option key={college.id} value={college.id}>
              {college.name}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-xs text-ink-faint">
          Your college affiliation is verified by the email domain you register with.
        </p>
      </div>

      <SubmitButton label="Create my profile" />
    </form>
  );
}
