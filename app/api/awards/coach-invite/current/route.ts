import { NextRequest, NextResponse } from "next/server";
import { proxyPublic } from "@/lib/backend";
import {
  coachInviteToken,
  clearCoachInviteCookie,
} from "@/lib/coach-invite-cookie";
import type { CoachAccessLinkInfo } from "@/lib/awards-types";

export async function GET(request: NextRequest) {
  const token = coachInviteToken(request);

  if (!token) {
    return NextResponse.json(
      {
        title: "Credenciamento não iniciado",
        status: 404,
        detail: "Nenhum link de credenciamento de treinador está ativo neste navegador.",
        code: "COACH_ACCESS_NOT_STARTED",
      },
      { status: 404 },
    );
  }

  const response = await proxyPublic(
    `/api/v1/public/awards/coach-access/${encodeURIComponent(token)}`,
  );

  if (!response.ok) {
    clearCoachInviteCookie(response);
    return response;
  }

  const invite = (await response.clone().json()) as CoachAccessLinkInfo;

  if (!invite.available) {
    clearCoachInviteCookie(response);
  }

  return response;
}
