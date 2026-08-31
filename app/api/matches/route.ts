import { NextRequest } from "next/server";
import { proxyAuthenticated } from "@/lib/backend";

export async function GET(
  request: NextRequest,
) {
  const searchParams =
    request.nextUrl.searchParams.toString();

  const suffix =
    searchParams
      ? `?${searchParams}`
      : "";

  return proxyAuthenticated(
    request,
    `/api/v1/matches${suffix}`,
  );
}