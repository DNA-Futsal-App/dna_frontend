import { NextRequest, NextResponse } from "next/server";
import { proxyPublic } from "@/lib/backend";

type Context = { params: Promise<{ token: string }> };

export async function GET(_request: NextRequest, { params }: Context) {
  const { token } = await params;
  if (token.length < 20 || token.length > 200) {
    return NextResponse.json({ code: "COACH_CATEGORY_LINK_INVALID", detail: "Convite inválido." }, { status: 404 });
  }
  const result = await proxyPublic(`/api/v1/public/awards/coach-category-links/${encodeURIComponent(token)}`);
  result.headers.set("Cache-Control", "no-store");
  return result;
}
