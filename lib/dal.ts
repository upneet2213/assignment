// lib/dal.ts
import "server-only";
import { cookies } from "next/headers";
import { decrypt } from "./session";
import { cache } from "react";
import { db } from "./db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const verifySession = cache(async () => {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  const payload = await decrypt(session);

  if (!payload?.userId) {
    return null; // not authenticated
  }

  return { isAuth: true, userId: payload.userId as number };
});

export const getUser = cache(async () => {
  const session = await verifySession();
  if (!session) return null;

  const data = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, session.userId));

  return data[0] ?? null;
});
