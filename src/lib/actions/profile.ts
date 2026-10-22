"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser, hashPassword, verifyPassword } from "@/lib/auth";
import { recomputeUserScore } from "@/lib/services/scores";
import { isPlatform } from "@/lib/constants";
import {
  AccountError,
  generateVerificationCode,
  linkAccount,
  syncAccount,
  unlinkAccount,
} from "@/lib/services/accounts";

export type ActionState = { ok: boolean; message: string; data?: unknown } | null;

async function currentUserId(): Promise<string> {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user.id;
}

const profileSchema = z.object({
  displayName: z.string().trim().min(2).max(60),
  bio: z.string().trim().max(500).optional().nullable(),
  avatarUrl: z.string().trim().url().optional().nullable().or(z.literal("")),
  collegeId: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  courseId: z.string().optional().nullable(),
  academicYear: z.coerce.number().int().min(1).max(6).optional().nullable(),
  batch: z.string().trim().max(20).optional().nullable(),
  graduationYear: z.coerce.number().int().min(2000).max(2100).optional().nullable(),
  codingInterests: z.string().trim().max(300).optional().nullable(),
  timezone: z.string().trim().max(60).optional().nullable(),
});

export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await currentUserId();
  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName"),
    bio: formData.get("bio") || null,
    avatarUrl: formData.get("avatarUrl") || null,
    collegeId: formData.get("collegeId") || null,
    departmentId: formData.get("departmentId") || null,
    courseId: formData.get("courseId") || null,
    academicYear: formData.get("academicYear") || null,
    batch: formData.get("batch") || null,
    graduationYear: formData.get("graduationYear") || null,
    codingInterests: formData.get("codingInterests") || null,
    timezone: formData.get("timezone") || null,
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, message: first?.message ?? "Invalid profile data" };
  }

  const data = parsed.data;

  // Guard against linking a course that belongs to a different college.
  if (data.courseId) {
    const course = await prisma.course.findUnique({ where: { id: data.courseId } });
    if (!course) return { ok: false, message: "That course no longer exists." };
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      displayName: data.displayName,
      bio: data.bio ?? null,
      avatarUrl: data.avatarUrl ?? null,
      collegeId: data.collegeId ?? null,
      departmentId: data.departmentId ?? null,
      courseId: data.courseId ?? null,
      academicYear: data.academicYear ?? null,
      batch: data.batch ?? null,
      graduationYear: data.graduationYear ?? null,
      codingInterests: data.codingInterests ?? null,
      timezone: data.timezone || "Asia/Kolkata",
    },
  });

  await recomputeUserScore(userId).catch(() => undefined);
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true, message: "Profile updated." };
}

const privacySchema = z.object({
  isPublic: z.boolean(),
  showInDirectory: z.boolean(),
  showRatings: z.boolean(),
  showPlatforms: z.boolean(),
  showEmail: z.boolean(),
});

export async function updatePrivacyAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await currentUserId();
  const parsed = privacySchema.safeParse({
    isPublic: formData.get("isPublic") === "on",
    showInDirectory: formData.get("showInDirectory") === "on",
    showRatings: formData.get("showRatings") === "on",
    showPlatforms: formData.get("showPlatforms") === "on",
    showEmail: formData.get("showEmail") === "on",
  });
  if (!parsed.success) return { ok: false, message: "Invalid privacy settings." };

  await prisma.user.update({ where: { id: userId }, data: parsed.data });
  revalidatePath("/settings");
  return { ok: true, message: "Privacy settings saved." };
}

export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await currentUserId();
  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");

  if (next.length < 8) return { ok: false, message: "New password must be at least 8 characters." };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !(await verifyPassword(current, user.passwordHash))) {
    return { ok: false, message: "Current password is incorrect." };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(next) },
  });
  return { ok: true, message: "Password changed." };
}

export async function deleteAccountAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await currentUserId();
  if (String(formData.get("confirm") ?? "").trim().toUpperCase() !== "DELETE") {
    return { ok: false, message: "Type DELETE to confirm account deletion." };
  }
  await prisma.user.delete({ where: { id: userId } });
  redirect("/");
}

export async function linkAccountAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await currentUserId();
  const platform = String(formData.get("platform") ?? "");
  const handle = String(formData.get("handle") ?? "");
  const verificationCode = String(formData.get("verificationCode") ?? "").trim() || null;

  if (!isPlatform(platform)) return { ok: false, message: "Choose a platform." };

  try {
    const result = await linkAccount({ userId, platform, handle, verificationCode });
    await recomputeUserScore(userId).catch(() => undefined);
    revalidatePath("/settings");
    return { ok: true, message: result.message, data: { status: result.status } };
  } catch (err) {
    if (err instanceof AccountError) return { ok: false, message: err.message };
    return { ok: false, message: "Could not link that account right now." };
  }
}

export async function unlinkAccountAction(formData: FormData): Promise<void> {
  const userId = await currentUserId();
  const accountId = String(formData.get("accountId") ?? "");
  await unlinkAccount(userId, accountId);
  await recomputeUserScore(userId).catch(() => undefined);
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

export async function syncAccountAction(formData: FormData): Promise<void> {
  const userId = await currentUserId();
  const accountId = String(formData.get("accountId") ?? "");
  const account = await prisma.linkedAccount.findFirst({ where: { id: accountId, userId } });
  if (account) await syncAccount(accountId);
  await recomputeUserScore(userId).catch(() => undefined);
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

export async function syncAllAccountsAction(): Promise<void> {
  const userId = await currentUserId();
  const accounts = await prisma.linkedAccount.findMany({ where: { userId } });
  for (const account of accounts) {
    await syncAccount(account.id);
  }
  await recomputeUserScore(userId).catch(() => undefined);
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

export async function requestVerificationCodeAction(
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const userId = await currentUserId();
  const code = generateVerificationCode();
  const accounts = await prisma.linkedAccount.findMany({ where: { userId } });

  for (const account of accounts) {
    await prisma.verificationClaim.upsert({
      where: { platform_handle: { platform: account.platform, handle: account.handle } },
      create: {
        userId,
        platform: account.platform,
        handle: account.handle,
        code,
        status: "PENDING",
      },
      update: { code, status: "PENDING" },
    });
    await prisma.linkedAccount.update({
      where: { id: account.id },
      data: { verificationStatus: "PENDING" },
    });
  }

  return {
    ok: true,
    message: `Code ${code} generated. Put it in the display name or organisation field of your linked profiles, then re-sync.`,
    data: { code },
  };
}

export async function getVerificationCodeAction(): Promise<ActionState> {
  const userId = await currentUserId();
  const claims = await prisma.verificationClaim.findMany({ where: { userId } });
  const code = claims[0]?.code ?? generateVerificationCode();
  return { ok: true, message: code, data: { code } };
}
