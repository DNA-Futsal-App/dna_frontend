import { NextRequest } from "next/server";
import { proxyAuthenticated } from "@/lib/backend";

export async function GET(request: NextRequest) {
  return proxyAuthenticated(
    request,
    "/api/v1/awards/coach-voting/ballot",
  );
}

export async function POST(request: NextRequest) {
  return proxyAuthenticated(
    request,
    "/api/v1/awards/coach-voting/ballot",
    {
      method: "POST",
      body: JSON.stringify(await request.json()),
    },
  );
}
