import { NextRequest } from "next/server";
import { logoutFromBackend } from "@/lib/backend";

export async function POST(request: NextRequest) {
  return logoutFromBackend(request);
}
