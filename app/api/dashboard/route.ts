import { NextRequest, NextResponse } from "next/server";
import { authenticatedBatch, isDemoRequest } from "@/lib/backend";
import { demoDashboard } from "@/lib/demo-data";

export async function GET(request: NextRequest) {
  if (isDemoRequest(request)) return NextResponse.json(demoDashboard);
  return authenticatedBatch(request, {
    played: "/api/v1/matches/played",
    upcoming: "/api/v1/matches/upcoming",
    standings: "/api/v1/standings",
    topScorers: "/api/v1/top-scorers",
    news: "/api/v1/news?page=0&size=3",
  });
}
