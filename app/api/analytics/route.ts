import { NextRequest, NextResponse } from "next/server";
import { saveAnalytics, listAnalytics } from "@/lib/db/analytics";

export async function GET(req: NextRequest) {
  try {
    const brand = req.nextUrl.searchParams.get("brand") || undefined;
    const data = await listAnalytics(brand);
    return NextResponse.json(data);
  } catch (error) {
    console.error("List analytics error:", error);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { brandName, period, channels, notes, campaignId } = body;

    if (!brandName || !period || !channels?.length) {
      return NextResponse.json({ error: "brandName, period, and channels are required" }, { status: 400 });
    }

    const totalSpend = channels.reduce((s: number, c: { spend: number }) => s + c.spend, 0);
    const totalRevenue = channels.reduce((s: number, c: { revenue: number }) => s + c.revenue, 0);

    const entry = await saveAnalytics({
      brandName,
      campaignId,
      period,
      channels,
      totalSpend,
      totalRevenue,
      notes,
    });

    return NextResponse.json(entry);
  } catch (error) {
    console.error("Save analytics error:", error);
    return NextResponse.json({ error: "Failed to save analytics" }, { status: 500 });
  }
}
