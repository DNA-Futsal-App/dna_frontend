import { NextRequest } from "next/server";
import { proxyPublic } from "@/lib/backend";
import {
  coachInviteToken,
  clearCoachInviteCookie,
} from "@/lib/coach-invite-cookie";

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as Record<string, unknown>;
  const inviteToken = coachInviteToken(request);

  const response = await proxyPublic("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({
      ...payload,
      coachInviteToken: inviteToken ?? null,
    }),
  });

  if (response.ok && inviteToken) {
    clearCoachInviteCookie(response);
  }

  return response;
}
