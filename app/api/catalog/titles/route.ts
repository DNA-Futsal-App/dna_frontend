import { NextRequest } from "next/server";
import { proxyPublic } from "@/lib/backend";

/** Official competition titles for a specific award edition season. */
export async function GET(request: NextRequest) {
  const season = request.nextUrl.searchParams.get("season") ?? String(new Date().getFullYear());
  return proxyPublic(`/api/v1/public/catalog/titles?season=${encodeURIComponent(season)}`);
}
