import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import path from "path";
import fs from "fs/promises";

const OUTPUT_DIR = path.join(process.cwd(), "public", "output");

interface TextOverlay {
  text: string;
  position: "top" | "center" | "bottom";
  size: "small" | "medium" | "large";
}

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, overlay, width, height, aspectRatio } = await req.json();
    if (!imageUrl) {
      return NextResponse.json({ error: "No image URL" }, { status: 400 });
    }

    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    // Fetch the source image
    let imgBuffer: Buffer;
    if (imageUrl.startsWith("/")) {
      imgBuffer = await fs.readFile(path.join(process.cwd(), "public", imageUrl));
    } else if (imageUrl.startsWith("data:")) {
      const b64 = imageUrl.split(",")[1];
      imgBuffer = Buffer.from(b64, "base64");
    } else {
      const res = await fetch(imageUrl);
      imgBuffer = Buffer.from(await res.arrayBuffer());
    }

    // Resize / crop to target aspect ratio
    let pipeline = sharp(imgBuffer).resize(width || 1920, height || 1080, {
      fit: "cover",
      position: "centre",
    });

    // If there's a text overlay, composite it via an SVG layer
    if (overlay?.text) {
      const ov = overlay as TextOverlay;
      const svgW = width || 1920;
      const svgH = height || 1080;
      const fontSize = ov.size === "small" ? Math.round(svgH * 0.03) : ov.size === "large" ? Math.round(svgH * 0.06) : Math.round(svgH * 0.04);
      const yPos = ov.position === "top" ? Math.round(svgH * 0.1) : ov.position === "center" ? Math.round(svgH * 0.5) : Math.round(svgH * 0.88);

      // Escape XML entities in user text
      const safeText = String(ov.text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

      const svgOverlay = Buffer.from(`<svg width="${svgW}" height="${svgH}">
        <defs>
          <filter id="bg" x="-0.05" y="-0.15" width="1.1" height="1.3">
            <feFlood flood-color="rgba(0,0,0,0.6)" result="bg"/>
            <feMerge><feMergeNode in="bg"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <text x="50%" y="${yPos}" text-anchor="middle" dominant-baseline="middle"
          font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="bold"
          fill="white" filter="url(#bg)">${safeText}</text>
      </svg>`);

      pipeline = pipeline.composite([{ input: svgOverlay, top: 0, left: 0 }]);
    }

    const outBuf = await pipeline.png({ quality: 90 }).toBuffer();
    const filename = `poster_${aspectRatio?.replace(":", "x") || "16x9"}_${Date.now()}.png`;
    const outPath = path.join(OUTPUT_DIR, filename);
    await fs.writeFile(outPath, outBuf);

    return NextResponse.json({ url: `/output/${filename}` });
  } catch (err: unknown) {
    console.error("Poster export error:", err);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
