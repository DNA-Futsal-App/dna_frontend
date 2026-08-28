import { NextRequest, NextResponse } from "next/server";
import { isDemoRequest, proxyAuthenticated } from "@/lib/backend";

export async function GET(request: NextRequest) {
  return proxyAuthenticated(request, "/api/v1/me");
}

export async function PUT(request: NextRequest) {
  if (isDemoRequest(request)) return NextResponse.json({ ...(await request.json()) });
  return proxyAuthenticated(request, "/api/v1/me", {
    method: "PUT",
    body: JSON.stringify(await request.json()),
  });
}
