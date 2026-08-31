import { NextRequest } from "next/server";
import { authenticatedBatch } from "@/lib/backend";

export async function GET(
  request: NextRequest,
) {
  return authenticatedBatch(
    request,
    {
      sports: "/api/v1/home",
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