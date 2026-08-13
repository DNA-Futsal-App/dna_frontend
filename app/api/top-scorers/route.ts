import { NextRequest, NextResponse } from "next/server";
import { isDemoRequest, proxyAuthenticated } from "@/lib/backend";
import { demoTopScorers } from "@/lib/demo-data";

export async function GET(request: NextRequest) {
  if (isDemoRequest(request)) return NextResponse.json(demoTopScorers);
  return proxyAuthenticated(request, `/api/v1/top-scorers?${request.nextUrl.searchParams}`);
}
