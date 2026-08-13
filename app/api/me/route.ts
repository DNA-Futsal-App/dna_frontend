import { NextRequest, NextResponse } from "next/server";
import { isDemoRequest, proxyAuthenticated } from "@/lib/backend";
import { demoUser } from "@/lib/demo-data";

export async function GET(request: NextRequest) {
  if (isDemoRequest(request)) return NextResponse.json(demoUser);
  return proxyAuthenticated(request, "/api/v1/me");
}

export async function PUT(request: NextRequest) {
  if (isDemoRequest(request)) return NextResponse.json({ ...demoUser, ...(await request.json()) });
  return proxyAuthenticated(request, "/api/v1/me", {
    method: "PUT",
    body: JSON.stringify(await request.json()),
  });
}
