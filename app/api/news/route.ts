import { NextRequest, NextResponse } from "next/server";
import { isDemoRequest, proxyAuthenticated } from "@/lib/backend";
import { demoNewsPage } from "@/lib/demo-data";

export async function GET(request: NextRequest) {
  if (isDemoRequest(request)) return NextResponse.json(demoNewsPage);
  return proxyAuthenticated(request, `/api/v1/news?${request.nextUrl.searchParams}`);
}
