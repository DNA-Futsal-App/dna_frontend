import { NextRequest, NextResponse } from "next/server";
import { isDemoRequest, proxyAuthenticated } from "@/lib/backend";
import { demoNews } from "@/lib/demo-data";

export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  if (isDemoRequest(request)) {
    const article = demoNews.find((item) => item.slug === slug);
    return article
      ? NextResponse.json(article)
      : NextResponse.json({ detail: "Notícia não encontrada." }, { status: 404 });
  }
  return proxyAuthenticated(request, `/api/v1/news/${encodeURIComponent(slug)}`);
}
