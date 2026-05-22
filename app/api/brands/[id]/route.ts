// ─── /api/brands/[id] — get / patch / archive ───────────────────

import { NextRequest, NextResponse } from "next/server";
import { getBrand, updateBrand, archiveBrand, hardDeleteBrand } from "@/lib/db/brands";
import { listCampaignsForBrand } from "@/lib/db/campaigns";
import { requireUser } from "@/lib/api-auth";
import type { Brand } from "@/lib/types";
import { checkRateLimit, apiError, ERROR_CODES } from "@/lib/rate-limit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = checkRateLimit(req);
  if (rl) return rl;
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  const brand = await getBrand(id, user.userId);
  if (!brand) return apiError("Brand not found", ERROR_CODES.NOT_FOUND, 404);
  return NextResponse.json({ brand });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = checkRateLimit(req);
  if (rl) return rl;
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  try {
    const { id } = await params;
    const patch = (await req.json()) as Partial<Omit<Brand, "id" | "userId" | "createdAt">>;
    const updated = await updateBrand(id, user.userId, patch);
    if (!updated) return apiError("Brand not found", ERROR_CODES.NOT_FOUND, 404);
    return NextResponse.json({ brand: updated });
  } catch (err) {
    console.error("[/api/brands/[id] PATCH]", err);
    return apiError("Failed to update brand", ERROR_CODES.GENERATION_FAILED, 500);
  }
}

/**
 * DELETE behavior:
 *   - Default: soft-archive (archived=true). Existing campaigns can still resolve the brand.
 *   - ?hard=true: refuse if any campaigns reference this brand; otherwise hard-delete.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = checkRateLimit(req);
  if (rl) return rl;
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  try {
    const { id } = await params;
    const url = new URL(req.url);
    const hard = url.searchParams.get("hard") === "true";

    if (hard) {
      const campaigns = await listCampaignsForBrand(id, 1);
      if (campaigns.length > 0) {
        return apiError(
          "Cannot hard-delete a brand that still has campaigns. Archive instead, or delete campaigns first.",
          ERROR_CODES.GENERATION_FAILED,
          409
        );
      }
      await hardDeleteBrand(id, user.userId);
    } else {
      await archiveBrand(id, user.userId);
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[/api/brands/[id] DELETE]", err);
    return apiError("Failed to delete brand", ERROR_CODES.GENERATION_FAILED, 500);
  }
}
