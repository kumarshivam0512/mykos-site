import { NextRequest, NextResponse } from "next/server";
import { getCampaign, updateCampaign, deleteCampaign, ensureBrandForLegacyCampaign, type Campaign } from "@/lib/db/campaigns";
import { requireUser } from "@/lib/api-auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const campaign = await getCampaign(id);
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // ── Lazy migration (Workspace UX sprint) ──────────────────
    // Legacy v1 campaigns have no brandId. On first load by an authenticated
    // user, ensure a Brand exists and patch the campaign with it. Idempotent.
    if (!campaign.brandId) {
      try {
        const user = await requireUser();
        if (!(user instanceof NextResponse)) {
          const brandId = await ensureBrandForLegacyCampaign(campaign, user.userId);
          const migrated = await updateCampaign(id, { brandId, userId: user.userId });
          return NextResponse.json(migrated ?? campaign);
        }
      } catch { /* unauthenticated path → return as-is */ }
    }

    return NextResponse.json(campaign);
  } catch (error) {
    console.error("Get campaign error:", error);
    return NextResponse.json({ error: "Failed to load campaign" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const patch = (await req.json()) as Partial<Omit<Campaign, "id" | "createdAt" | "brandName">>;
    const updated = await updateCampaign(id, patch);
    if (!updated) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update campaign error:", error);
    return NextResponse.json({ error: "Failed to update campaign" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const campaign = await getCampaign(id);
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    await deleteCampaign(id, campaign.brandName);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete campaign error:", error);
    return NextResponse.json({ error: "Failed to delete campaign" }, { status: 500 });
  }
}
