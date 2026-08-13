import { NextRequest, NextResponse } from "next/server";
import { demoEnabled, proxyPublic } from "@/lib/backend";

export async function GET(request: NextRequest) {
  const categoryId = request.nextUrl.searchParams.get("categoryId") ?? "";
  if (demoEnabled()) {
    return NextResponse.json([
      { id: "especial", name: "Divisão Especial" },
      { id: "a1", name: "Série A1" },
      { id: "a2", name: "Série A2" },
    ]);
  }
  return proxyPublic(`/api/v1/public/catalog/divisions?categoryId=${encodeURIComponent(categoryId)}`);
}
