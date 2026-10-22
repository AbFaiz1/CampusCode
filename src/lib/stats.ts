/** Pure helpers used by the dashboard and profile views. */

export function countRecent(dates: Date[], days: number): number {
  const cutoff = Date.now() - days * 86400000;
  return dates.filter((d) => d.getTime() >= cutoff).length;
}

export function daysSince(date: Date | null | undefined): number | null {
  if (!date) return null;
  return Math.floor((Date.now() - date.getTime()) / 86400000);
}
