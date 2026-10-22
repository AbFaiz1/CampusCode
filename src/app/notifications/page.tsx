import Link from "next/link";
import { redirect } from "next/navigation";
import { BellRing, CheckCheck } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { listNotifications } from "@/lib/services/reminders";
import { EmptyState, PageHeader } from "@/components/ui";
import { markNotificationsReadAction } from "@/lib/actions/community";

export const metadata = { title: "Alerts" };

// This route depends on request-time session data, so it renders per request.
export const instant = false;

export default async function NotificationsPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const notifications = await listNotifications(session.id, 60);
  const unread = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="Inbox"
        title="Alerts"
        description="Reminders for saved contests, schedule changes and friend activity. Reminders are scheduled on our servers, so they arrive even if you closed the site."
        actions={
          unread ? (
            <form action={markNotificationsReadAction}>
              <button type="submit" className="btn btn-secondary">
                <CheckCheck className="h-4 w-4" />
                Mark all read
              </button>
            </form>
          ) : null
        }
      />

      {notifications.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          description="Save a contest from the calendar and we will alert you before it starts."
          icon={<BellRing className="h-5 w-5" />}
          action={
            <Link href="/contests" className="btn btn-primary">
              Browse contests
            </Link>
          }
        />
      ) : (
        <div className="card divide-y divide-line-soft overflow-hidden">
          {notifications.map((notification) => (
            <Link
              key={notification.id}
              href={notification.link ?? "/dashboard"}
              className={`flex items-start gap-3 px-4 py-3.5 transition hover:bg-surface-2 ${
                notification.readAt ? "opacity-65" : ""
              }`}
            >
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                  notification.readAt ? "bg-line" : "bg-brand"
                }`}
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-ink">{notification.title}</span>
                <span className="mt-0.5 block text-sm text-ink-muted">{notification.body}</span>
                <span className="mt-1 block text-[0.68rem] text-ink-faint">
                  {new Date(notification.createdAt).toLocaleString("en-IN")} ·{" "}
                  {notification.kind.replace(/_/g, " ").toLowerCase()}
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
