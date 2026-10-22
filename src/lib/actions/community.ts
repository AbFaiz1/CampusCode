"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import {
  cancelReminder,
  saveContestReminder,
  type ReminderChannel,
} from "@/lib/services/reminders";
import {
  removeFriend,
  respondToFriendRequest,
  sendFriendRequest,
} from "@/lib/services/friends";
import { markNotificationsRead } from "@/lib/services/reminders";
import { recomputeUserScore } from "@/lib/services/scores";

export type ActionState = { ok: boolean; message: string } | null;

async function currentUserId(): Promise<string> {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user.id;
}

export async function saveReminderAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await currentUserId();
  const contestId = String(formData.get("contestId") ?? "");
  const offsetMinutes = Number(formData.get("offsetMinutes") ?? 60);
  const channel = (String(formData.get("channel") ?? "WEB_PUSH") as ReminderChannel) || "WEB_PUSH";

  const result = await saveContestReminder({ userId, contestId, offsetMinutes, channel });
  if (result.ok) revalidatePath("/contests");
  return { ok: result.ok, message: result.message };
}

export async function cancelReminderAction(formData: FormData): Promise<void> {
  const userId = await currentUserId();
  const reminderId = String(formData.get("reminderId") ?? "");
  await cancelReminder(userId, reminderId);
  revalidatePath("/contests");
}

export async function sendFriendRequestAction(formData: FormData): Promise<void> {
  const userId = await currentUserId();
  const addresseeId = String(formData.get("addresseeId") ?? "");
  await sendFriendRequest(userId, addresseeId);
  revalidatePath("/friends");
  revalidatePath("/u");
}

export async function respondToFriendRequestAction(formData: FormData): Promise<void> {
  const userId = await currentUserId();
  const friendshipId = String(formData.get("friendshipId") ?? "");
  const accept = formData.get("accept") === "true";
  await respondToFriendRequest(userId, friendshipId, accept);
  revalidatePath("/friends");
}

export async function removeFriendAction(formData: FormData): Promise<void> {
  const userId = await currentUserId();
  const friendId = String(formData.get("friendId") ?? "");
  await removeFriend(userId, friendId);
  revalidatePath("/friends");
}

export async function markNotificationsReadAction(): Promise<void> {
  const userId = await currentUserId();
  await markNotificationsRead(userId);
  revalidatePath("/notifications");
}

export async function setWeeklyGoalAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await currentUserId();
  const target = Number(formData.get("targetContests") ?? 2);
  if (!Number.isFinite(target) || target < 0 || target > 14) {
    return { ok: false, message: "Choose a weekly target between 0 and 14 contests." };
  }

  const now = new Date();
  const day = (now.getUTCDay() + 6) % 7; // Monday = 0
  const weekStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day),
  );

  await prisma.goal.upsert({
    where: { userId_weekStart: { userId, weekStart } },
    create: { userId, weekStart, targetContests: target },
    update: { targetContests: target },
  });

  revalidatePath("/friends");
  return { ok: true, message: `Weekly goal set to ${target} contest${target === 1 ? "" : "s"}.` };
}

export async function createGroupAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await currentUserId();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const isPrivate = formData.get("isPrivate") !== "false";

  if (name.length < 3) return { ok: false, message: "Give the group a name of at least 3 characters." };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;

  await prisma.group.create({
    data: {
      name,
      slug,
      description: description || null,
      collegeId: user?.collegeId ?? null,
      ownerId: userId,
      isPrivate,
      joinCode: Math.random().toString(36).slice(2, 10).toUpperCase(),
      members: { create: { userId, role: "OWNER" } },
    },
  });

  revalidatePath("/groups");
  return { ok: true, message: `Group "${name}" created.` };
}

export async function joinGroupAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await currentUserId();
  const code = String(formData.get("joinCode") ?? "").trim().toUpperCase();
  if (!code) return { ok: false, message: "Enter the group code." };

  const group = await prisma.group.findUnique({ where: { joinCode: code } });
  if (!group) return { ok: false, message: "No group found with that code." };

  await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId: group.id, userId } },
    create: { groupId: group.id, userId, role: "MEMBER" },
    update: {},
  });

  revalidatePath("/groups");
  return { ok: true, message: `Joined "${group.name}".` };
}

export async function createChallengeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await currentUserId();
  const groupId = String(formData.get("groupId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const metric = String(formData.get("metric") ?? "CONTESTS");
  const target = Number(formData.get("target") ?? 1);
  const days = Number(formData.get("days") ?? 7);

  if (!title) return { ok: false, message: "Give the challenge a title." };
  if (!groupId) return { ok: false, message: "Pick a group." };

  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!member) return { ok: false, message: "You are not a member of that group." };

  await prisma.groupChallenge.create({
    data: {
      groupId,
      createdById: userId,
      title,
      description: String(formData.get("description") ?? "") || null,
      metric,
      target: Number.isFinite(target) ? target : 1,
      startsAt: new Date(),
      endsAt: new Date(Date.now() + (Number.isFinite(days) ? days : 7) * 86400000),
    },
  });

  revalidatePath("/groups");
  return { ok: true, message: "Challenge created." };
}

export async function refreshMyScoreAction(): Promise<void> {
  const userId = await currentUserId();
  await recomputeUserScore(userId).catch(() => undefined);
  revalidatePath("/dashboard");
}
