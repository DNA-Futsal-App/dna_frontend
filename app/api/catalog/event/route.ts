import { NextRequest, NextResponse } from "next/server";
import { proxyPublic } from "@/lib/backend";

/** Validate a category's eventId against official FPFS metadata before browsing. */
export async function GET(request: NextRequest) {
  const eventId = request.nextUrl.searchParams.get("eventId");
  if (!eventId || !/^[1-9]\d*$/.test(eventId)) {
    return NextResponse.json(
      { code: "INVALID_EVENT_ID", detail: "Informe um eventId válido." },
      { status: 400 },
    );
  }
  return proxyPublic(`/api/v1/public/events/${encodeURIComponent(eventId)}`);
}
