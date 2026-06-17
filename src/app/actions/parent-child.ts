"use server";

import { persistParentChildSelection } from "@/lib/parent-access";

export async function setParentChildAction(athleteId: string) {
  await persistParentChildSelection(athleteId);
}
