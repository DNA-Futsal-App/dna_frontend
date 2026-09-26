import { NextRequest } from "next/server";
import { proxyAuthenticated } from "@/lib/backend";

export async function POST(request: NextRequest) {
  return proxyAuthenticated(request, "/api/v1/awards/registrations", {
    method: "POST",
    body: JSON.stringify(await request.json()),
  });
}
