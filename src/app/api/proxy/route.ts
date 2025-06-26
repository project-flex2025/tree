// app/api/proxy-suggestions/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const q = searchParams.get("q");
  const type = searchParams.get("type") || "suggest";

  if (!q) {
    return NextResponse.json({ error: "Missing 'q' parameter" }, { status: 400 });
  }

  const apiUrl = `https://api.publications.ai/suggestions/?q=${encodeURIComponent(q)}&type=${type}`;

  try {
    const res = await fetch(apiUrl, {
      headers: {
        "Content-Type": "application/json",
      },
      // No CORS needed here because this runs server-side
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Upstream fetch failed" }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
