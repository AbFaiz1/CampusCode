"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";

const signupSchema = z.object({
  displayName: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
  collegeId: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  courseId: z.string().optional().nullable(),
  academicYear: z.coerce.number().int().min(1).max(6).optional().nullable(),
  batch: z.string().trim().max(20).optional().nullable(),
});

export type AuthFormState = { error?: string; fieldErrors?: Record<string, string> } | null;

export async function signupAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = signupSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
    collegeId: formData.get("collegeId") || null,
    departmentId: formData.get("departmentId") || null,
    courseId: formData.get("courseId") || null,
    academicYear: formData.get("academicYear") || null,
    batch: formData.get("batch") || null,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { error: "Please fix the highlighted fields.", fieldErrors };
  }

  const { displayName, email, password, collegeId, departmentId, courseId, academicYear, batch } =
    parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with that email already exists.", fieldErrors: { email: "Email already registered" } };
  }

  const user = await prisma.user.create({
    data: {
      email,
      displayName,
      passwordHash: await hashPassword(password),
      collegeId: collegeId || null,
      departmentId: departmentId || null,
      courseId: courseId || null,
      academicYear: academicYear ?? null,
      batch: batch || null,
    },
  });

  await createSession(user.id);
  redirect("/dashboard");
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

/** Only same-site paths are allowed as a post-login destination. */
function safeRedirectTarget(raw: FormDataEntryValue | null): string {
  if (typeof raw !== "string") return "/dashboard";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

export async function loginAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Enter your email and password." };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: "That email and password combination is not correct." };
  }

  await createSession(user.id);
  redirect(safeRedirectTarget(formData.get("next")));
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}
