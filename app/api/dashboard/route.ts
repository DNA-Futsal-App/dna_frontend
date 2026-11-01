import { NextRequest } from "next/server";
import { authenticatedBatch } from "@/lib/backend";
import { sportsHomePath } from "@/lib/sports-navigation";

export async function GET(
  request: NextRequest,
) {
  return authenticatedBatch(
    request,
    {
      sports: sportsHomePath(request.nextUrl.searchParams),
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