import { NextRequest, NextResponse } from "next/server";
import { isDemoRequest, proxyAuthenticated } from "@/lib/backend";

const backendPath = "/api/v1/admin/password-reset";

export async function GET(request: NextRequest) {
  const response = await proxyAuthenticated(request, backendPath, { method: "GET" });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function POST(request: NextRequest) {
  // Os cookies de sessão são enviados automaticamente: recuse solicitações cross-site.
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if ((origin && origin !== request.nextUrl.origin) ||
      (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none")) {
    return NextResponse.json(
      { code: "INVALID_ORIGIN", detail: "Origem da solicitação não autorizada." },
      { status: 403 },
    );
  }

  if (isDemoRequest(request)) {
    return NextResponse.json(
      { code: "DEMO_UNAVAILABLE", detail: "Operação indisponível no modo demonstração." },
      { status: 403 },
    );
  }

  const payload: unknown = await request.json().catch(() => null);
  const email = payload && typeof payload === "object" && "email" in payload
    ? (payload as { email?: unknown }).email
    : null;
  if (typeof email !== "string" || !email.trim() || email.length > 254) {
    return NextResponse.json(
      { code: "INVALID_EMAIL", detail: "Informe um e-mail válido." },
      { status: 400 },
    );
  }

  const response = await proxyAuthenticated(request, backendPath, {
    method: "POST",
    body: JSON.stringify({ email: email.trim() }),
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
