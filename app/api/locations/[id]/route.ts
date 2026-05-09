import { NextRequest, NextResponse } from "next/server";
import { getLocation, deleteLocation } from "@/lib/db/locations";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const loc = await getLocation(id);
    if (!loc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await deleteLocation(id, loc.brandName);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete location error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
