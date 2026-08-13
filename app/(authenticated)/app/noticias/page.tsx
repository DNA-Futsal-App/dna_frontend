"use client";

import { EmptyState, ErrorState, LoadingCards } from "@/components/feedback";
import { NewsCard } from "@/components/news-card";
import { PageIntro } from "@/components/page-intro";
import type { NewsPage } from "@/lib/types";
import { useApiData } from "@/lib/use-api-data";

export default function NewsPageRoute() {
  const { data, loading, error, reload } = useApiData<NewsPage>("/api/news?page=0&size=20");
  return <div><PageIntro eyebrow="Além das quatro linhas" title="Notícias" description="Histórias, destaques e tudo que movimenta o futsal de base paulista." />{loading ? <LoadingCards count={5} /> : error ? <ErrorState message={error} onRetry={reload} /> : !data?.content.length ? <EmptyState title="Nenhuma notícia publicada" description="As próximas matérias da redação aparecerão aqui." /> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.content.map((article, index) => <div key={article.id} className={index === 0 ? "md:col-span-2 xl:col-span-2" : ""}><NewsCard article={article} featured={index === 0} /></div>)}</div>}</div>;
}
