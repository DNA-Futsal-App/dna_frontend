import { NextRequest, NextResponse } from "next/server";
import { demoEnabled, proxyPublic } from "@/lib/backend";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const season =
    params.get("season") ??
    String(new Date().getFullYear());

  const divisionId =
    params.get("divisionId");

  if (!divisionId) {
    return NextResponse.json(
      {
        title: "Divisão necessária",
        status: 400,
        detail:
          "Informe uma divisão antes de consultar as categorias.",
        code: "DIVISION_REQUIRED",
      },
      { status: 400 },
    );
  }

  if (demoEnabled()) {
    return NextResponse.json([
      {
        id: "7",
        name: "Sub-11",
        eventId: 917,
      },
      {
        id: "8",
        name: "Sub-13",
        eventId: 918,
      },
    ]);
  }

  const query = new URLSearchParams({
    season,
    divisionId,
  });

  return proxyPublic(
    `/api/v1/public/catalog/categories?${query}`,
  );
}