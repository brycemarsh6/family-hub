"use server";

// Signing in and out. See src/lib/session.ts for the cookie mechanics and
// src/lib/dal.ts for the check every other Server Action performs.
//
// These two are deliberately the ONLY actions in the app that don't call
// verifySession() first — logging in is what you do when you don't have a
// session, and logging out doesn't need one to be safe.

import { redirect } from "next/navigation";
import {
  createSession,
  deleteSession,
  isCorrectPassword,
} from "@/lib/session";

export type LoginState = { error?: string };

export async function login(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");

  if (!password) {
    return { error: "Enter the family password." };
  }

  if (!isCorrectPassword(password)) {
    // Deliberately vague and identical for every failure. There's only one
    // password, so there's nothing useful to distinguish — and a specific
    // message ("too short", "close") would help someone guessing.
    return { error: "That's not the family password." };
  }

  await createSession();

  // redirect() works by throwing a signal Next.js catches, so it must sit
  // outside any try/catch — there isn't one here, which is why.
  redirect("/");
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/login");
}
