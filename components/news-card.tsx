import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { formatDate } from "@/lib/client-api";
import type { NewsArticle } from "@/lib/types";

export function NewsCard({ article, featured = false }: { article: NewsArticle; featured?: boolean }) {
  return (
    <Link href={`/app/noticias/${article.slug}`} className={`group surface block overflow-hidden rounded-2xl transition hover:-translate-y-0.5 hover:border-cyan/25 ${featured ? "sm:grid sm:grid-cols-[1.2fr_1fr]" : ""}`}>
      <div className={`relative overflow-hidden bg-gradient-to-br from-deep/40 via-ocean/15 to-coral/20 ${featured ? "min-h-48" : "h-36"}`}>
        <div className="absolute -right-8 -top-8 size-36 rounded-full border-[18px] border-cyan/15" />
        <div className="absolute bottom-5 left-5 display-title text-5xl font-black text-white/10">DNA</div>
        <span className="absolute left-4 top-4 rounded-full bg-night/75 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-cyan backdrop-blur">Notícias</span>
      </div>
      <div className="p-4 sm:p-5">
        <p className="text-xs font-bold text-amber">{formatDate(article.publishedAt, { day: "2-digit", month: "long" })}</p>
        <h3 className={`mt-2 font-black leading-tight text-ivory group-hover:text-cyan ${featured ? "text-xl sm:text-2xl" : "text-lg"}`}>{article.title}</h3>
        {article.summary ? <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{article.summary}</p> : null}
        <span className="mt-4 inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider text-cyan">Ler matéria <ArrowUpRight className="size-3.5" aria-hidden="true" /></span>
      </div>
    </Link>
  );
}
