"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/actions/community";

/**
 * Generic wrapper that turns a stateful server action into a plain form
 * action and renders its feedback message.
 */
export function ActionForm({
  action,
  children,
  className,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, null);

  return (
    <form action={formAction} className={className}>
      {children}
      {state?.message ? (
        <p
          role="status"
          className={`mt-2 rounded-lg border px-3 py-2 text-sm ${
            state.ok
              ? "border-positive/40 bg-positive/10 text-positive"
              : "border-danger/40 bg-danger/10 text-danger"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
