import { NextRequest } from "next/server";
import { proxyAuthenticated } from "@/lib/backend";

export async function GET(
  request: NextRequest,
) {
  const searchParams =
    request.nextUrl.searchParams.toString();

  const suffix =
    searchParams
      ? `?${searchParams}`
      : "";

  const stage = request.nextUrl.searchParams.get("stage");
  const eventId = request.nextUrl.searchParams.get("eventId");
  const path = stage && eventId ? "/api/v1/sports/matches" : "/api/v1/matches";
  return proxyAuthenticated(request, `${path}${suffix}`);
}