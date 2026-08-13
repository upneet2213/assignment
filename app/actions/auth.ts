"use server";
import { LoginFormSchema, SignupFormSchema } from "@/lib/definitions";
import { users } from "@/db/schema";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { parseWithZod } from "@conform-to/zod/v4";
import { SubmissionResult } from "@conform-to/react";
import { createSession, deleteSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

export async function signup(
  _prevState: SubmissionResult<string[]> | undefined,
  formData: FormData,
) {
  // Validate form fields
  const submission = parseWithZod(formData, {
    schema: SignupFormSchema,
  });

  if (submission.status !== "success") {
    return submission.reply();
  }
  const { name, email, password } = submission.value;
  // e.g. Hash the user's password before storing it
  const hashedPassword = await bcrypt.hash(password, 10);

  // 3. Insert the user into the database or call an Auth Library's API
  const data = await db
    .insert(users)
    .values({
      name,
      email,
      password: hashedPassword,
    })
    .returning({ id: users.id });

  const user = data[0];

  if (!user) {
    return submission.reply({
      formErrors: ["An error occurred while creating your account."],
    });
  }

  await createSession(user.id);

  redirect("/");
}

export async function login(
  _prevState: SubmissionResult<string[]> | undefined,
  formData: FormData,
) {
  const submission = parseWithZod(formData, {
    schema: LoginFormSchema,
  });

  if (submission.status !== "success") {
    return submission.reply();
  }
  const { email, password } = submission.value;

  const data = await db.select().from(users).where(eq(users.email, email));
  const user = data[0];
  const isPasswordValid = await bcrypt.compare(
    password,
    user?.password ?? "$2b$10$invalidsaltinvalidsaltinvalidsO",
  );

  if (!user || !isPasswordValid) {
    return submission.reply({
      formErrors: ["Invalid email or password."],
    });
  }

  await createSession(user.id);

  redirect("/");
}

export async function logout() {
  await deleteSession();
  redirect("/");
}
