import type { CampusClass } from "@/lib/constants";

export const CLASS_HEX: Record<CampusClass, string> = {
  C: "#22d3ee",
  B: "#3b82f6",
  A: "#a855f7",
  S: "#fbbf24",
};

export const CLASS_STYLES: Record<
  CampusClass,
  { text: string; bg: string; border: string; ring: string; glow: string }
> = {
  C: {
    text: "text-class-c",
    bg: "bg-class-c/12",
    border: "border-class-c/35",
    ring: "ring-class-c/40",
    glow: "shadow-[0_0_22px_-6px_var(--color-class-c)]",
  },
  B: {
    text: "text-class-b",
    bg: "bg-class-b/12",
    border: "border-class-b/35",
    ring: "ring-class-b/40",
    glow: "shadow-[0_0_22px_-6px_var(--color-class-b)]",
  },
  A: {
    text: "text-class-a",
    bg: "bg-class-a/12",
    border: "border-class-a/35",
    ring: "ring-class-a/40",
    glow: "shadow-[0_0_22px_-6px_var(--color-class-a)]",
  },
  S: {
    text: "text-class-s",
    bg: "bg-class-s/12",
    border: "border-class-s/40",
    ring: "ring-class-s/45",
    glow: "shadow-[0_0_26px_-6px_var(--color-class-s)]",
  },
};

export function classStyle(value: string) {
  return CLASS_STYLES[(value as CampusClass) ?? "C"] ?? CLASS_STYLES.C;
}

export function classHex(value: string): string {
  return CLASS_HEX[(value as CampusClass) ?? "C"] ?? CLASS_HEX.C;
}
