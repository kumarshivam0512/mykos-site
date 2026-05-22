// ─── API auth helpers (Workspace UX sprint) ─────────────────────
//
// Centralizes the "who is the current user?" check used by /api/brands and
// /api/campaigns. We use `session.user.email` as the userId (confirmed with
// user 20 May 2026) — stable, debuggable, swappable later for a hash.
//
// For local development without auth set up, set DEV_USER_EMAIL=you@dev.local
// in .env.local to bypass — keeps the dev loop fast without changing prod.

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export interface RequireUserResult {
  userId: string;
  email: string;
}

/**
 * Resolve the current user's identifier. Returns either:
 *   { userId, email }  — successful auth
 *   NextResponse        — 401 to return directly from the route handler
 *
 * Usage:
 *   const user = await requireUser();
 *   if (user instanceof NextResponse) return user;
 *   // ...use user.userId
 */
export async function requireUser(): Promise<RequireUserResult | NextResponse> {
  // Dev escape hatch for local-only work without configuring auth.
  const devEmail = process.env.DEV_USER_EMAIL;
  if (devEmail) {
    return { userId: devEmail, email: devEmail };
  }
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return { userId: email, email };
}
