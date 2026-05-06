import { NextRequest, NextResponse } from "next/server";
import { PEXELS_SEARCH_TERMS } from "@/types";

const PEXELS_API_KEY = process.env.PEXELS_API_KEY || "";

export interface PexelsSearchResult {
  id: number;
  image: string;
  duration: number;
  width: number;
  height: number;
  url: string;
  videoFile: string;
}

export async function GET(req: NextRequest) {
  if (!PEXELS_API_KEY) {
    return NextResponse.json({ error: "PEXELS_API_KEY no configurada" }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query") || "";
  const grupo = parseInt(searchParams.get("grupo") || "0");
  const page = parseInt(searchParams.get("page") || "1");

  // Usar query manual o términos del grupo
  const searchQuery = query || (PEXELS_SEARCH_TERMS[grupo]?.[0] ?? "nature");

  const res = await fetch(
    `https://api.pexels.com/videos/search?query=${encodeURIComponent(searchQuery)}&orientation=portrait&per_page=15&page=${page}&size=medium`,
    { headers: { Authorization: PEXELS_API_KEY } }
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: `Pexels API error: ${res.status}` },
      { status: res.status }
    );
  }

  const data = await res.json();

  const results: PexelsSearchResult[] = (data.videos || []).map(
    (v: Record<string, unknown>) => {
      const files = v.video_files as { link: string; width: number; height: number; quality: string }[];
      // Preferir vertical, mayor resolución
      const best = files
        .filter((f) => f.height > f.width)
        .sort((a, b) => b.height - a.height)[0]
        || files.sort((a, b) => b.height - a.height)[0];

      return {
        id: v.id as number,
        image: v.image as string,
        duration: v.duration as number,
        width: best?.width || 0,
        height: best?.height || 0,
        url: (v.url as string) || "",
        videoFile: best?.link || "",
      };
    }
  );

  // Términos sugeridos para este grupo
  const suggestions = grupo ? (PEXELS_SEARCH_TERMS[grupo] || []) : [];

  return NextResponse.json({
    results,
    total: data.total_results || 0,
    page,
    suggestions,
  });
}
