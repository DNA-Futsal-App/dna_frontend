import { NextRequest } from "next/server";
import { loginWithBackend } from "@/lib/backend";

export async function POST(request: NextRequest) {
  const response = await loginWithBackend(await request.json().catch(() => null));
  response.headers.set("Cache-Control", "no-store");
  return response;
}
