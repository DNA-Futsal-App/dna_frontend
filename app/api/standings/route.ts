import { NextRequest, NextResponse } from "next/server";
import { isDemoRequest, proxyAuthenticated } from "@/lib/backend";
import { demoStandings } from "@/lib/demo-data";

export async function GET(request: NextRequest) {
  if (isDemoRequest(request)) return NextResponse.json(demoStandings);
  return proxyAuthenticated(request, `/api/v1/standings?${request.nextUrl.searchParams}`);
}
