import { NextRequest } from "next/server";
import {proxyAuthenticated } from "@/lib/backend";

export async function GET(request: NextRequest) {
  return proxyAuthenticated(request, `/api/v1/top-scorers?${request.nextUrl.searchParams}`);
}
