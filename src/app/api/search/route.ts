/* eslint-disable */
import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";

// Handles GET requests like /api/search?keyword=cancer
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("keyword");

  if (!keyword) {
    return NextResponse.json({ error: "Keyword is required." }, { status: 400 });
  }

  // Absolute path to public/keywords.json
  const filePath = path.join(process.cwd(), "public", "keywords.json");

  try {
    const fileData = await fs.readFile(filePath, "utf-8");
    const keywords = JSON.parse(fileData);

    const matched = keywords.filter((item: any) =>
      item.keyword.toLowerCase().includes(keyword.toLowerCase())
    );

    return NextResponse.json(matched);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to read or parse keywords.json", details: (error as any).message },
      { status: 500 }
    );
  }
}
