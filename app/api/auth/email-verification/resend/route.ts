import { NextRequest } from "next/server";
import { proxyPublic } from "@/lib/backend";

export async function POST(request: NextRequest) {
  return proxyPublic("/api/v1/auth/email-verification/resend", {
    method: "POST",
    body: JSON.stringify(await request.json()),
  });
}
