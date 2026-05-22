import { NextRequest, NextResponse } from "next/server";
import { saveCampaign, listCampaigns, listCampaignsForUser, listCampaignsForBrand } from "@/lib/db/campaigns";
import { requireUser } from "@/lib/api-auth";
import { getBrand, createBrand, brandFromLegacyKit } from "@/lib/db/brands";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const brandId = url.searchParams.get("brandId");
    const mine = url.searchParams.get("mine") === "true";

    // Mine = scoped to authenticated user (preferred for sidebar switcher).
    if (mine || brandId) {
      const user = await requireUser();
      if (user instanceof NextResponse) return user;
      const campaigns = brandId
        ? await listCampaignsForBrand(brandId)
        : await listCampaignsForUser(user.userId);
      return NextResponse.json(campaigns);
    }

    // Legacy unscoped list — kept for back-compat with Campaign Library page.
    const campaigns = await listCampaigns();
    return NextResponse.json(campaigns);
  } catch (error) {
    console.error("List campaigns error:", error);
    return NextResponse.json({ error: "Failed to load campaigns" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      productInput,
      brandKit,
      brief,
      competitorName,
      brandId,             // v2 — preferred. POST without it falls back to legacy nested kit.
      sceneMotions,
      assets,
      preferences,
      status,
    } = body;

    if (!productInput?.name || !brief) {
      return NextResponse.json({ error: "Product input and brief are required" }, { status: 400 });
    }

    // Resolve userId if authenticated — required for v2 brand linkage.
    // If no auth available, falls back to a legacy save without userId/brandId
    // so existing unauthenticated flows keep working during the transition.
    let userId: string | undefined;
    let resolvedBrandId: string | undefined = brandId;
    try {
      const user = await requireUser();
      if (!(user instanceof NextResponse)) {
        userId = user.userId;
      }
    } catch { /* unauthenticated path */ }

    // If a userId is available but no brandId, auto-create a Brand from the
    // nested kit. Avoids "campaign with no brand" edge state in v2 data.
    if (userId && !resolvedBrandId && brandKit) {
      const seed = brandFromLegacyKit(userId, productInput.name, brandKit);
      const created = await createBrand(seed);
      resolvedBrandId = created.id;
    }

    // If brandId is provided, hydrate brandName from the Brand record so the
    // partition key matches the source of truth.
    let brandName: string = productInput.name;
    if (resolvedBrandId && userId) {
      const brand = await getBrand(resolvedBrandId, userId);
      if (brand) brandName = brand.name;
    }

    const campaign = await saveCampaign({
      brandName,
      brandId: resolvedBrandId,
      userId,
      productInput,
      brandKit: brandKit || { colors: [], fonts: [] },
      brief,
      competitorName,
      sceneMotions,
      assets,
      preferences,
      status: status ?? "draft",
    });

    return NextResponse.json(campaign);
  } catch (error) {
    console.error("Save campaign error:", error);
    return NextResponse.json({ error: "Failed to save campaign" }, { status: 500 });
  }
}
