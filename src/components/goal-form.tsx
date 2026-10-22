"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { setWeeklyGoalAction, type ActionState } from "@/lib/actions/community";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-secondary" disabled={pending}>
      {pending ? "Saving…" : "Save goal"}
    </button>
  );
}

export function GoalForm({ current }: { current: number }) {
  const [state, action] = useActionState<ActionState, FormData>(setWeeklyGoalAction, null);

  return (
    <form action={action} className="flex items-end gap-3">
      <div className="flex-1">
        <label className="label" htmlFor="targetContests">
          Contests per week
        </label>
        <input
          id="targetContests"
          name="targetContests"
          type="number"
          min={0}
          max={14}
          defaultValue={current}
          className="input"
        />
      </div>
      <Submit />
      {state?.message ? (
        <span className="text-xs text-ink-faint" role="status">
          {state.message}
        </span>
      ) : null}
    </form>
  );
}
