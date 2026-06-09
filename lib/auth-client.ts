"use client";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

export const { signIn, signOut, signUp, useSession } = authClient;

// Type helper — `role` is returned at runtime by the server but isn't in
// Better Auth's default user type. Use this cast anywhere you need it.
export type SessionUser = ReturnType<typeof useSession>["data"] extends { user: infer U } | null
  ? U & { role: string }
  : never;
