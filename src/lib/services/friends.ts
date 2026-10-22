import "server-only";

import { prisma } from "@/lib/db";

export type FriendRequestResult = { ok: boolean; message: string };

export async function sendFriendRequest(
  requesterId: string,
  addresseeId: string,
): Promise<FriendRequestResult> {
  if (requesterId === addresseeId) {
    return { ok: false, message: "You cannot add yourself." };
  }
  const addressee = await prisma.user.findUnique({
    where: { id: addresseeId },
    select: { id: true, displayName: true },
  });
  if (!addressee) return { ok: false, message: "Student not found." };

  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId, addresseeId },
        { requesterId: addresseeId, addresseeId: requesterId },
      ],
    },
  });
  if (existing) {
    if (existing.status === "ACCEPTED") {
      return { ok: false, message: `You are already friends with ${addressee.displayName}.` };
    }
    if (existing.status === "PENDING") {
      return { ok: false, message: "A request is already pending between you." };
    }
    await prisma.friendship.update({
      where: { id: existing.id },
      data: { status: "PENDING", requesterId, addresseeId, respondedAt: null },
    });
    return { ok: true, message: `Friend request sent to ${addressee.displayName}.` };
  }

  await prisma.friendship.create({
    data: { requesterId, addresseeId, status: "PENDING" },
  });
  await prisma.notification.create({
    data: {
      userId: addresseeId,
      title: "New friend request",
      body: "A student wants to connect on CampusCode.",
      link: "/friends",
      kind: "FRIEND",
    },
  });
  return { ok: true, message: `Friend request sent to ${addressee.displayName}.` };
}

export async function respondToFriendRequest(
  userId: string,
  friendshipId: string,
  accept: boolean,
): Promise<FriendRequestResult> {
  const friendship = await prisma.friendship.findFirst({
    where: { id: friendshipId, addresseeId: userId },
    include: { requester: { select: { displayName: true } } },
  });
  if (!friendship) return { ok: false, message: "Request not found." };

  await prisma.friendship.update({
    where: { id: friendshipId },
    data: { status: accept ? "ACCEPTED" : "REJECTED", respondedAt: new Date() },
  });

  if (accept) {
    await prisma.notification.create({
      data: {
        userId: friendship.requesterId,
        title: "Friend request accepted",
        body: `${friendship.requester.displayName} accepted your request.`,
        link: "/friends",
        kind: "FRIEND",
      },
    });
    await prisma.activityEvent.create({
      data: {
        userId: friendship.requesterId,
        type: "FRIEND_JOIN",
        title: `You and ${friendship.requester.displayName} are now friends`,
        points: 5,
      },
    });
  }

  return {
    ok: true,
    message: accept ? "Friend request accepted." : "Friend request declined.",
  };
}

export async function removeFriend(userId: string, friendId: string): Promise<FriendRequestResult> {
  const deleted = await prisma.friendship.deleteMany({
    where: {
      status: "ACCEPTED",
      OR: [
        { requesterId: userId, addresseeId: friendId },
        { requesterId: friendId, addresseeId: userId },
      ],
    },
  });
  return deleted.count
    ? { ok: true, message: "Friend removed." }
    : { ok: false, message: "Friend not found." };
}

export async function listFriends(userId: string) {
  const friendships = await prisma.friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    include: {
      requester: {
        include: { accounts: true, college: true, department: true, course: true },
      },
      addressee: {
        include: { accounts: true, college: true, department: true, course: true },
      },
    },
  });

  return friendships.map((f) => {
    const friend = f.requesterId === userId ? f.addressee : f.requester;
    return {
      id: friend.id,
      displayName: friend.displayName,
      avatarUrl: friend.avatarUrl,
      campusScore: friend.campusScore,
      campusClass: friend.campusClass,
      activityLevel: friend.activityLevel,
      college: friend.college?.name ?? null,
      department: friend.department?.name ?? null,
      course: friend.course?.shortName ?? friend.course?.name ?? null,
      batch: friend.batch,
      accounts: friend.accounts.map((a) => ({
        platform: a.platform,
        rating: a.rating,
        verificationStatus: a.verificationStatus,
      })),
      since: f.createdAt,
    };
  });
}

export async function listFriendRequests(userId: string) {
  const incoming = await prisma.friendship.findMany({
    where: { addresseeId: userId, status: "PENDING" },
    include: { requester: { select: { id: true, displayName: true, avatarUrl: true, campusClass: true } } },
  });
  const outgoing = await prisma.friendship.findMany({
    where: { requesterId: userId, status: "PENDING" },
    include: { addressee: { select: { id: true, displayName: true, avatarUrl: true, campusClass: true } } },
  });
  return { incoming, outgoing };
}
