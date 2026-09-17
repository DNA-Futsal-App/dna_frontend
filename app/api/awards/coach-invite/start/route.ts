import { NextRequest, NextResponse } from "next/server";
import { proxyPublic } from "@/lib/backend";
import {
  clearCoachInviteCookie,
  setCoachInviteCookie,
} from "@/lib/coach-invite-cookie";
import type { CoachInviteInfo } from "@/lib/awards-types";

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => null)) as
    | { token?: unknown }
    | null;

  const token =
    typeof payload?.token === "string"
      ? payload.token.trim()
      : "";

  if (token.length < 20 || token.length > 200) {
    return NextResponse.json(
      {
        title: "Convite inválido",
        status: 400,
        detail: "O link de convite está incompleto.",
        code: "COACH_INVITE_INVALID",
      },
      { status: 400 },
    );
  }

  const response = await proxyPublic(
    `/api/v1/public/awards/coach-invites/${encodeURIComponent(token)}`,
  );

  if (!response.ok) {
    clearCoachInviteCookie(response);
    return response;
  }

  const invite = (await response.clone().json()) as CoachInviteInfo;

  if (invite.available) {
    setCoachInviteCookie(response, token);
  } else {
    clearCoachInviteCookie(response);
  }

  return response;
}
