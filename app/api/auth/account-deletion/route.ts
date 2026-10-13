import { NextRequest, NextResponse } from "next/server";
import { requestAccountDeletion } from "@/lib/backend";

export const maxDuration = 65;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (typeof body?.currentPassword !== "string" || !body.currentPassword.trim()
    || body.currentPassword.length > 72) {
    return NextResponse.json({ code: "INVALID_INPUT", detail: "Informe sua senha atual (até 72 caracteres)." }, {
      status: 400, headers: { "Cache-Control": "no-store" },
    });
  }
  return requestAccountDeletion(request, body.currentPassword);
}
