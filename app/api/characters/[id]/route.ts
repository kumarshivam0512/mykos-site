import { NextRequest, NextResponse } from "next/server";
import { getCharacter, deleteCharacter } from "@/lib/db/characters";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const char = await getCharacter(id);
    if (!char) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await deleteCharacter(id, char.brandName);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete character error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
