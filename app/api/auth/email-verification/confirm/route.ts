import { NextRequest } from "next/server";
import { proxyPublic } from "@/lib/backend";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  return proxyPublic(`/api/v1/auth/email-verification/confirm?token=${encodeURIComponent(token)}`);
}
