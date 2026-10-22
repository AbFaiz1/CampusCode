import Link from "next/link";
import { classStyle } from "@/lib/class-styles";

export function Avatar({
  name,
  src,
  size = 40,
  className,
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  if (src) {
    return (
      // Remote avatars come from many hosts, so a plain img keeps the build simple.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className={`shrink-0 rounded-full border border-line object-cover ${className ?? ""}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full border border-line bg-surface-3 font-semibold text-ink-muted ${className ?? ""}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden
    >
      {initials || "?"}
    </span>
  );
}

export function StudentRow({
  student,
  rank,
  href,
  showScore = true,
}: {
  student: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    campusScore: number;
    campusClass: string;
    activityLevel?: string;
    department?: { name: string } | null;
    course?: { name: string; shortName: string | null } | null;
    batch?: string | null;
    academicYear?: number | null;
  };
  rank?: number;
  href?: string;
  showScore?: boolean;
}) {
  const style = classStyle(student.campusClass);
  const body = (
    <>
      {rank !== undefined && (
        <span className="w-7 shrink-0 text-center font-mono text-sm text-ink-faint">
          {rank}
        </span>
      )}
      <Avatar name={student.displayName} src={student.avatarUrl} size={38} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate font-medium text-ink">{student.displayName}</span>
          <span
            className={`inline-flex h-5 w-5 items-center justify-center rounded-md border font-mono text-[0.6rem] font-bold ${style.text} ${style.bg} ${style.border}`}
            title={`Class ${student.campusClass}`}
          >
            {student.campusClass}
          </span>
        </span>
        <span className="block truncate text-xs text-ink-faint">
          {[student.course?.shortName ?? student.course?.name, student.department?.name]
            .filter(Boolean)
            .join(" · ") || "No department set"}
        </span>
      </span>
      {showScore && (
        <span className="shrink-0 text-right">
          <span className="block font-mono text-sm font-semibold text-ink">
            {Math.round(student.campusScore)}
          </span>
          <span className="block text-[0.65rem] uppercase tracking-wide text-ink-faint">
            score
          </span>
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition hover:border-line hover:bg-surface-2"
      >
        {body}
      </Link>
    );
  }

  return <div className="flex items-center gap-3 px-3 py-2.5">{body}</div>;
}
