import { NextRequest, NextResponse } from "next/server";
import { saveCampaign, listCampaigns } from "@/lib/db/campaigns";

export async function GET() {
  try {
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
    const { productInput, brandKit, brief, competitorName } = body;

    if (!productInput?.name || !brief) {
      return NextResponse.json({ error: "Product input and brief are required" }, { status: 400 });
    }

    const campaign = await saveCampaign({
      brandName: productInput.name,
      productInput,
      brandKit: brandKit || { colors: [], fonts: [] },
      brief,
      competitorName,
    });

    return NextResponse.json(campaign);
  } catch (error) {
    console.error("Save campaign error:", error);
    return NextResponse.json({ error: "Failed to save campaign" }, { status: 500 });
  }
}
