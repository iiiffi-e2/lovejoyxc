"use server";

import { cookies } from "next/headers";
import { PARENT_CHILD_COOKIE } from "@/lib/parent-access";

export async function setParentChildAction(athleteId: string) {
  const store = await cookies();
  store.set(PARENT_CHILD_COOKIE, athleteId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
