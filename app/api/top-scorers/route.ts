import { NextRequest } from "next/server";
import {proxyAuthenticated } from "@/lib/backend";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const path = params.get("stage") && params.get("eventId")
    ? "/api/v1/sports/top-scorers" : "/api/v1/top-scorers";
  return proxyAuthenticated(request, `${path}?${params}`);
}
