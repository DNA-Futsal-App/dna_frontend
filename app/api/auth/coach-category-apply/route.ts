import { NextRequest } from "next/server";
import { proxyAuthenticated } from "@/lib/backend";

export async function POST(request: NextRequest) {
  return proxyAuthenticated(request, "/api/v1/awards/coach-category-applications", {
    method: "POST",
    body: await request.text(),
  });
}
