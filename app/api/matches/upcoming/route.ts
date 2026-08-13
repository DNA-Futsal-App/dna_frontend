import { NextRequest, NextResponse } from "next/server";
import { isDemoRequest, proxyAuthenticated } from "@/lib/backend";
import { demoUpcoming } from "@/lib/demo-data";

export async function GET(request: NextRequest) {
  if (isDemoRequest(request)) return NextResponse.json(demoUpcoming);
  return proxyAuthenticated(request, `/api/v1/matches/upcoming?${request.nextUrl.searchParams}`);
}
