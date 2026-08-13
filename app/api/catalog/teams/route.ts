import { NextRequest, NextResponse } from "next/server";
import { demoEnabled, proxyPublic } from "@/lib/backend";
import { demoTeams } from "@/lib/demo-data";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  if (demoEnabled()) return NextResponse.json(demoTeams);
  const query = new URLSearchParams({
    categoryId: params.get("categoryId") ?? "",
    divisionId: params.get("divisionId") ?? "",
  });
  return proxyPublic(`/api/v1/public/catalog/teams?${query}`);
}
