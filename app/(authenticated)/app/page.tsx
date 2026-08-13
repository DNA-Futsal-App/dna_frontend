"use client";

import Link from "next/link";
import { ArrowRight, CalendarClock, Goal, Newspaper, TrendingUp } from "lucide-react";
import { ErrorState, LoadingCards } from "@/components/feedback";
import { MatchCard } from "@/components/match-card";
import { NewsCard } from "@/components/news-card";
import { SectionHeading } from "@/components/section-heading";
import { StandingsTable } from "@/components/standings-table";
import { TopScorerList } from "@/components/top-scorer-list";
import type { DashboardData } from "@/lib/types";
import { useApiData } from "@/lib/use-api-data";
import { useProfile } from "@/components/profile-context";

export default function DashboardPage() {
  const { data, loading, error, reload } = useApiData<DashboardData>("/api/dashboard");
  const { profile } = useProfile();
  if (loading) return <DashboardSkeleton />;
  if (error || !data) return <ErrorState message={error || "Dados não encontrados."} onRetry={reload} />;
  const nextMatch = data.upcoming[0];
  const latestMatch = data.played[0];
  const position = data.standings.find((row) => row.team.id === profile?.teamId)?.position ?? data.standings[0]?.position;
  const firstName = profile?.name.split(" ")[0];

  return (
    <div>
      <div className="mb-7 flex items-end justify-between gap-4"><div><p className="eyebrow">Seu resumo</p><h1 className="display-title mt-2 text-4xl font-black leading-none text-ivory sm:text-5xl">Olá{firstName ? `, ${firstName}` : ""}.</h1><p className="mt-2 text-sm text-muted sm:text-base">Aqui está o que importa para o seu time hoje.</p></div></div>

      {nextMatch ? (
        <section className="relative overflow-hidden rounded-[1.75rem] border border-cyan/20 bg-gradient-to-br from-deep/35 via-panel to-night p-5 shadow-glow sm:p-7">
          <div className="absolute -right-16 -top-20 size-64 rounded-full border-[26px] border-cyan/6" />
          <div className="relative"><p className="eyebrow"><CalendarClock className="size-4" />Próximo desafio</p><div className="mt-5"><MatchCard match={nextMatch} /></div><Link href="/app/jogos" className="mt-4 inline-flex items-center gap-2 text-sm font-black text-cyan hover:text-white">Ver calendário completo <ArrowRight className="size-4" /></Link></div>
        </section>
      ) : null}

      <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={TrendingUp} label="Posição" value={position ? `${position}º` : "—"} color="cyan" />
        <Stat icon={Goal} label="Último jogo" value={latestMatch ? `${latestMatch.homeScore} × ${latestMatch.awayScore}` : "—"} color="amber" />
        <Stat icon={CalendarClock} label="Próximos" value={String(data.upcoming.length)} color="coral" />
        <Stat icon={Newspaper} label="Notícias" value={String(data.news.totalElements)} color="ocean" />
      </section>

      <section className="mt-10"><SectionHeading eyebrow="Desempenho" title="Classificação" href="/app/tabela" /><StandingsTable standings={data.standings} followedTeamId={profile?.teamId} limit={5} /></section>
      <div className="mt-10 grid gap-10 xl:grid-cols-2">
        <section><SectionHeading eyebrow="Goleadores" title="Artilharia" href="/app/artilharia" /><TopScorerList scorers={data.topScorers} limit={4} /></section>
        <section><SectionHeading eyebrow="Últimos resultados" title="Jogos encerrados" href="/app/jogos?tab=played" /><div className="grid gap-3">{data.played.slice(0, 2).map((match) => <MatchCard key={match.id} match={match} compact />)}</div></section>
      </div>
      <section className="mt-10"><SectionHeading eyebrow="Conteúdo" title="Notícias da base" href="/app/noticias" /><div className="grid gap-4 lg:grid-cols-3">{data.news.content.slice(0, 3).map((article, index) => <NewsCard key={article.id} article={article} featured={index === 0 && data.news.content.length === 1} />)}</div></section>
    </div>
  );
}

function Stat({ icon: Icon, label, value, color }: { icon: typeof TrendingUp; label: string; value: string; color: "cyan" | "amber" | "coral" | "ocean" }) {
  const colors = { cyan: "bg-cyan/10 text-cyan", amber: "bg-amber/10 text-amber", coral: "bg-coral/10 text-coral", ocean: "bg-ocean/10 text-ocean" };
  return <article className="surface rounded-2xl p-4 sm:p-5"><span className={`inline-flex size-9 items-center justify-center rounded-xl ${colors[color]}`}><Icon className="size-4.5" /></span><strong className="mt-4 block display-title text-3xl font-black text-ivory">{value}</strong><span className="text-xs font-bold text-muted">{label}</span></article>;
}

function DashboardSkeleton() {
  return <div><div className="skeleton h-10 w-64 rounded-xl" /><div className="skeleton mt-3 h-4 w-80 max-w-full rounded-full" /><div className="skeleton mt-7 h-64 rounded-[1.75rem]" /><div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}</div><div className="mt-10"><LoadingCards count={3} /></div></div>;
}
