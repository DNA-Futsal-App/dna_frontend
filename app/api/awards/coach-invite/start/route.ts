import { NextRequest, NextResponse } from "next/server";
import { proxyPublic } from "@/lib/backend";
import {
  clearCoachInviteCookie,
  setCoachInviteCookie,
} from "@/lib/coach-invite-cookie";
import type { CoachAccessLinkInfo } from "@/lib/awards-types";

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
        title: "Credenciamento inválido",
        status: 400,
        detail: "O link de credenciamento está incompleto.",
        code: "COACH_ACCESS_INVALID",
      },
      { status: 400 },
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

  if (invite.available) {
    setCoachInviteCookie(response, token);
  } else {
    clearCoachInviteCookie(response);
  }

  return response;
}
