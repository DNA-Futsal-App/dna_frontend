import { NextRequest, NextResponse } from "next/server";
import { isDemoRequest, proxyAuthenticated } from "@/lib/backend";
import { demoPlayed } from "@/lib/demo-data";

export async function GET(request: NextRequest) {
  if (isDemoRequest(request)) return NextResponse.json(demoPlayed);
  return proxyAuthenticated(request, `/api/v1/matches/played?${request.nextUrl.searchParams}`);
}
