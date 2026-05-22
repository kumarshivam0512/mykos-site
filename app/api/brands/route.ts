// ─── /api/brands — list + create (Workspace UX sprint) ──────────
//
// GET  /api/brands                    → list brands for current user
// POST /api/brands { name, kit?, ...} → create a new brand

import { NextRequest, NextResponse } from "next/server";
import { createBrand, listBrandsForUser } from "@/lib/db/brands";
import { requireUser } from "@/lib/api-auth";
import { makeBrandSeed, type BrandKit } from "@/lib/types";
import { checkRateLimit, apiError, ERROR_CODES } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const rl = checkRateLimit(req);
  if (rl) return rl;

  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  try {
    const url = new URL(req.url);
    const includeArchived = url.searchParams.get("archived") === "true";
    const brands = await listBrandsForUser(user.userId, { includeArchived });
    return NextResponse.json({ brands });
  } catch (err) {
    console.error("[/api/brands GET]", err);
    return apiError("Failed to list brands", ERROR_CODES.GENERATION_FAILED, 500);
  }
}

interface CreateBody {
  name: string;
  description?: string;
  kit?: Partial<BrandKit>;
  tagline?: string;
  websiteUrl?: string;
}

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req);
  if (rl) return rl;

  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  try {
    const body = (await req.json()) as CreateBody;
    if (!body.name?.trim()) {
      return apiError("`name` is required", ERROR_CODES.MISSING_INPUT, 400);
    }
    const seed = makeBrandSeed(user.userId, body.name, body.kit);
    const brand = await createBrand({
      ...seed,
      description: body.description,
      tagline: body.tagline,
      websiteUrl: body.websiteUrl,
    });
    return NextResponse.json({ brand }, { status: 201 });
  } catch (err) {
    console.error("[/api/brands POST]", err);
    return apiError("Failed to create brand", ERROR_CODES.GENERATION_FAILED, 500);
  }
}
