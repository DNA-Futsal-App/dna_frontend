import { NextRequest, NextResponse } from "next/server";
import { isDemoRequest, proxyAuthenticated } from "@/lib/backend";

export async function GET(request: NextRequest) {
  return proxyAuthenticated(request, `/api/v1/news?${request.nextUrl.searchParams}`);
}
