"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Bell, BellOff, CalendarPlus, Check } from "lucide-react";
import { saveReminderAction, type ActionState } from "@/lib/actions/community";

function SaveButton({ label, offsetMinutes, disabled }: { label: string; offsetMinutes: number; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="offsetMinutes"
      value={offsetMinutes}
      disabled={disabled || pending}
      className="btn btn-ghost px-2.5 py-1.5 text-xs"
    >
      {pending ? "…" : label}
    </button>
  );
}

export function ReminderControls({
  contestId,
  savedOffsets,
}: {
  contestId: string;
  savedOffsets: number[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(saveReminderAction, null);

  const options = [
    { label: "24h before", minutes: 1440 },
    { label: "1h before", minutes: 60 },
    { label: "10m before", minutes: 10 },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1">
      <form action={action} className="flex flex-wrap items-center gap-1">
        <input type="hidden" name="contestId" value={contestId} />
        {options.map((option) => {
          const saved = savedOffsets.includes(option.minutes);
          return (
            <SaveButton
              key={option.minutes}
              label={saved ? `✓ ${option.label}` : option.label}
              offsetMinutes={option.minutes}
              disabled={saved}
            />
          );
        })}
      </form>
      {state?.message ? (
        <span className="text-[0.7rem] text-ink-faint" role="status">
          {state.message}
        </span>
      ) : null}
    </div>
  );
}

export function IcsLink({ contestId }: { contestId: string }) {
  return (
    <a
      href={`/api/contests/calendar.ics?contest=${contestId}`}
      className="btn btn-ghost px-2.5 py-1.5 text-xs"
      title="Add to your calendar"
    >
      <CalendarPlus className="h-3.5 w-3.5" />
      .ics
    </a>
  );
}

export function NotifyToggle({ enabled }: { enabled: boolean }) {
  return (
    <button
      type="button"
      onClick={async () => {
        if (!("Notification" in window)) return;
        if (enabled) {
          const registration = await navigator.serviceWorker?.getRegistration();
          registration?.showNotification("CampusCode", {
            body: "Browser notifications are on.",
          });
          return;
        }
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          await navigator.serviceWorker?.register("/sw.js").catch(() => undefined);
        }
      }}
      className="btn btn-ghost px-2.5 py-1.5 text-xs"
    >
      {enabled ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
      {enabled ? "Notifications on" : "Enable browser alerts"}
    </button>
  );
}

export function SavedMark() {
  return (
    <span className="chip border-positive/40 bg-positive/10 text-positive">
      <Check className="h-3 w-3" />
      Saved
    </span>
  );
}
