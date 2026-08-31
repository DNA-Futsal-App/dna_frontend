import { NextRequest } from "next/server";
import { proxyAuthenticated } from "@/lib/backend";

export async function GET(
  request: NextRequest,
) {
  const query =
    request.nextUrl.searchParams.toString();

  return proxyAuthenticated(
    request,
    `/api/v1/my-team${
      query ? `?${query}` : ""
    }`,
  );
}