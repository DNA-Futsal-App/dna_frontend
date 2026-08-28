import { NextRequest, NextResponse } from "next/server";
import { demoEnabled, proxyPublic } from "@/lib/backend";

export async function GET(request: NextRequest) {
  const eventId =
    request.nextUrl.searchParams.get("eventId");

  if (!eventId) {
    return NextResponse.json(
      {
        title: "Evento necessário",
        status: 400,
        detail:
          "Informe um evento antes de consultar os times.",
        code: "EVENT_REQUIRED",
      },
      {
        status: 400,
      },
    );
  }

  if (demoEnabled()) {
    return NextResponse.json([
      {
        id: "10",
        name: "Time A",
        shortName: null,
        logoUrl: null,
      },
      {
        id: "20",
        name: "Time B",
        shortName: null,
        logoUrl: null,
      },
    ]);
  }

  const query = new URLSearchParams({
    eventId,
  });

  return proxyPublic(
    `/api/v1/public/catalog/teams?${query.toString()}`,
  );
}