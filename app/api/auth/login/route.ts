import { NextRequest } from "next/server";
import { loginWithBackend } from "@/lib/backend";

export async function POST(request: NextRequest) {
  return loginWithBackend(await request.json());
}
