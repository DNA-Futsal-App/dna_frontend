import { NextRequest, NextResponse } from "next/server";
import { demoEnabled, proxyPublic } from "@/lib/backend";

export async function GET(request: NextRequest) {
  const season = request.nextUrl.searchParams.get("season") ?? String(new Date().getFullYear());
  if (!/^\d{4}$/.test(season) || Number(season) < 2016 || Number(season) > 2100) {
    return NextResponse.json({ code: "INVALID_SEASON", detail: "Temporada inválida" }, { status: 400 });
  }
  if (demoEnabled()) return NextResponse.json([{ id: 1, name: "Paulista" }]);
  return proxyPublic(`/api/v1/public/catalog/titles?season=${encodeURIComponent(season)}`);
}
