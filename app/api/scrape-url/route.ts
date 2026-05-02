import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        return NextResponse.json({ error: "Only HTTP/HTTPS URLs allowed" }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(parsedUrl.href, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; MykosAI/1.0; +https://mykos.ai)",
        },
      });

      if (!res.ok) {
        return NextResponse.json({ error: `Failed to fetch URL (${res.status})` }, { status: 502 });
      }

      const html = await res.text();

      // Extract meta tags
      const getMetaContent = (nameOrProperty: string): string | null => {
        const patterns = [
          new RegExp(`<meta[^>]+(?:name|property)=["']${nameOrProperty}["'][^>]+content=["']([^"']*)["']`, "i"),
          new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${nameOrProperty}["']`, "i"),
        ];
        for (const pattern of patterns) {
          const match = html.match(pattern);
          if (match?.[1]) return match[1].trim();
        }
        return null;
      };

      // Extract title
      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      const ogTitle = getMetaContent("og:title");
      const twitterTitle = getMetaContent("twitter:title");

      // Extract description
      const metaDesc = getMetaContent("description");
      const ogDesc = getMetaContent("og:description");
      const twitterDesc = getMetaContent("twitter:description");

      const name = ogTitle || twitterTitle || titleMatch?.[1]?.trim() || "";
      const description = ogDesc || twitterDesc || metaDesc || "";

      return NextResponse.json({
        name: name.slice(0, 100),
        description: description.slice(0, 300),
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.error("URL scraping error:", error);
    return NextResponse.json(
      { error: "Failed to scrape URL" },
      { status: 500 }
    );
  }
}
