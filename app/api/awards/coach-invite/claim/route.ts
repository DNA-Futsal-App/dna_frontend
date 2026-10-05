import { NextRequest, NextResponse } from "next/server";
import {
  proxyAuthenticated,
  proxyPublic,
} from "@/lib/backend";
import {
  coachInviteToken,
  clearCoachInviteCookie,
} from "@/lib/coach-invite-cookie";

export async function POST(request: NextRequest) {
  const token = coachInviteToken(request);

  if (!token) {
    return NextResponse.json(
      {
        title: "Credenciamento não iniciado",
        status: 404,
        detail: "Nenhum link de credenciamento está ativo neste navegador.",
        code: "COACH_ACCESS_NOT_STARTED",
      },
      { status: 404 },
    );
  }

  const inspection = await proxyPublic(
    `/api/v1/public/awards/coach-access/${encodeURIComponent(token)}`,
  );

  if (!inspection.ok) {
    clearCoachInviteCookie(inspection);
    return inspection;
  }

  const response = await proxyAuthenticated(
    request,
    "/api/v1/awards/coach-access/claim",
    {
      method: "POST",
      body: JSON.stringify({ token }),
    },
  );

  if (response.ok) {
    clearCoachInviteCookie(response);
  }

  return response;
}
