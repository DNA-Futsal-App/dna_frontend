import { NextRequest, NextResponse } from "next/server";
import { proxyAuthenticated } from "@/lib/backend";

export async function GET(request: NextRequest) {
  const voteCategoryId =
    request.nextUrl.searchParams.get("voteCategoryId")?.trim() ?? "";
  const teamId =
    request.nextUrl.searchParams.get("teamId")?.trim() ?? "";

  if (!voteCategoryId || !teamId) {
    return NextResponse.json(
      {
        title: "Filtros inválidos",
        status: 400,
        detail: "Informe a categoria de votação e o time.",
        code: "AWARD_VOTE_FILTER_INVALID",
      },
      { status: 400 },
    );
  }

  return proxyAuthenticated(
    request,
    `/api/v1/awards/coach-voting/candidates?voteCategoryId=${encodeURIComponent(
      voteCategoryId,
    )}&teamId=${encodeURIComponent(teamId)}`,
  );
}
