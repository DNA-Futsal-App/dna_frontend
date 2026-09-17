import "server-only";

import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "dna_coach_invite";

const cookieBase = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export function coachInviteToken(request: NextRequest) {
  return request.cookies.get(COOKIE_NAME)?.value ?? null;
}

export function setCoachInviteCookie(
  response: NextResponse,
  token: string,
) {
  response.cookies.set(COOKIE_NAME, token, {
    ...cookieBase,
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearCoachInviteCookie(response: NextResponse) {
  response.cookies.set(COOKIE_NAME, "", {
    ...cookieBase,
    maxAge: 0,
  });
}
