import { NextRequest, NextResponse } from "next/server";
import {
  proxyAuthenticated,
  proxyPublic,
} from "@/lib/backend";
import {
  coachInviteToken,
  clearCoachInviteCookie,
} from "@/lib/coach-invite-cookie";
import type { CoachInviteInfo } from "@/lib/awards-types";

export async function POST(request: NextRequest) {
  const token = coachInviteToken(request);

  if (!token) {
    return NextResponse.json(
      {
        title: "Convite não iniciado",
        status: 404,
        detail: "Nenhum convite de treinador está ativo neste navegador.",
        code: "COACH_INVITE_NOT_STARTED",
      },
      { status: 404 },
    );
  }

  const inspection = await proxyPublic(
    `/api/v1/public/awards/coach-invites/${encodeURIComponent(token)}`,
  );

  if (!inspection.ok) {
    clearCoachInviteCookie(inspection);
    return inspection;
  }

  const invite = (await inspection.json()) as CoachInviteInfo;

  const response = await proxyAuthenticated(
    request,
    "/api/v1/awards/coach-invites/claim",
    {
      method: "POST",
      body: JSON.stringify({
        token,
        eventId: invite.eventId,
        divisionId: invite.divisionId,
        categoryId: invite.categoryId,
        teamId: invite.teamId,
      }),
    },
  );

  if (response.ok) {
    clearCoachInviteCookie(response);
  }

  return response;
}
