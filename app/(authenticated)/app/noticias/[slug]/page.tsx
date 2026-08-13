"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CalendarDays, UserRound } from "lucide-react";
import { ErrorState, LoadingCards } from "@/components/feedback";
import { formatDate } from "@/lib/client-api";
import type { NewsArticle } from "@/lib/types";
import { useApiData } from "@/lib/use-api-data";

export default function ArticlePage() {
  const slug = String(useParams().slug);
  const { data, loading, error, reload } = useApiData<NewsArticle>(`/api/news/${encodeURIComponent(slug)}`);
  if (loading) return <LoadingCards count={3} />;
  if (error || !data) return <ErrorState message={error || "Notícia não encontrada."} onRetry={reload} />;
  return <article className="mx-auto max-w-3xl"><Link href="/app/noticias" className="mb-6 inline-flex items-center gap-2 text-sm font-black text-cyan hover:text-white"><ArrowLeft className="size-4" />Voltar para notícias</Link><div className="relative h-56 overflow-hidden rounded-[1.75rem] border border-cyan/12 bg-gradient-to-br from-deep/50 via-ocean/15 to-coral/25 sm:h-80"><div className="absolute -right-16 -top-20 size-72 rounded-full border-[34px] border-cyan/10" /><span className="absolute bottom-5 left-6 display-title text-7xl font-black text-white/8">DNA</span></div><p className="eyebrow mt-7">Notícias</p><h1 className="display-title mt-3 text-4xl font-black leading-[.95] text-ivory sm:text-6xl">{data.title}</h1>{data.summary ? <p className="mt-5 text-lg leading-relaxed text-muted sm:text-xl">{data.summary}</p> : null}<div className="mt-5 flex flex-wrap gap-4 border-y border-white/8 py-4 text-xs font-bold text-muted"><span className="inline-flex items-center gap-2"><CalendarDays className="size-4 text-cyan" />{formatDate(data.publishedAt, { day: "2-digit", month: "long", year: "numeric" })}</span>{data.authorName ? <span className="inline-flex items-center gap-2"><UserRound className="size-4 text-amber" />{data.authorName}</span> : null}</div><div className="mt-7 space-y-5 text-base leading-8 text-[#c9d3cd]">{(data.content ?? data.summary ?? "").split(/\n\n+/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div></article>;
}
