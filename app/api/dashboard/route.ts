import { NextRequest, NextResponse } from "next/server";
import { authenticatedBatch, isDemoRequest } from "@/lib/backend";

export async function GET(request: NextRequest) {
  return authenticatedBatch(
    request,
    {
      played: "/api/v1/matches/played",
      upcoming: "/api/v1/matches/upcoming",
      standings: "/api/v1/standings",
      topScorers: "/api/v1/top-scorers",
      news: "/api/v1/news?page=0&size=3",
    },
    {
      news: {
        content: [],
        page: 0,
        size: 3,
        totalElements: 0,
        totalPages: 0,
      },
    },
  );
}
