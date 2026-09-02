import { NextRequest } from "next/server";
import {proxyAuthenticated } from "@/lib/backend";

export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  return proxyAuthenticated(request, `/api/v1/news/${encodeURIComponent(slug)}`);
}
