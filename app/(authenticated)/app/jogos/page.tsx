"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { EmptyState, ErrorState, LoadingCards } from "@/components/feedback";
import { MatchCard } from "@/components/match-card";
import { PageIntro } from "@/components/page-intro";
import type { Match } from "@/lib/types";
import { useApiData } from "@/lib/use-api-data";

export default function MatchesPage() { return <Suspense><Matches /></Suspense>; }

function Matches() {
  const initial = useSearchParams().get("tab") === "played" ? "played" : "upcoming";
  const [tab, setTab] = useState<"upcoming" | "played">(initial);
  const { data, loading, error, reload } = useApiData<Match[]>(`/api/matches/${tab}`);
  return (
    <div><PageIntro eyebrow="Temporada 2026" title="Jogos" description="O calendário do seu time, separado entre os próximos confrontos e tudo que já aconteceu." action={<div className="inline-flex rounded-full border border-white/10 bg-ink/35 p-1"><Tab active={tab === "upcoming"} onClick={() => setTab("upcoming")}>Próximos</Tab><Tab active={tab === "played"} onClick={() => setTab("played")}>Encerrados</Tab></div>} />
      {loading ? <LoadingCards count={4} /> : error ? <ErrorState message={error} onRetry={reload} /> : !data?.length ? <EmptyState title="Nenhum jogo por aqui" description={tab === "upcoming" ? "Assim que a próxima rodada for confirmada, ela aparecerá aqui." : "Os resultados serão exibidos após o fim das partidas."} /> : <div className="grid gap-3 lg:grid-cols-2">{data.map((match) => <MatchCard key={match.id} match={match} />)}</div>}
    </div>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`min-h-10 rounded-full px-4 text-xs font-black transition ${active ? "bg-cyan text-ink" : "text-muted hover:text-ivory"}`}>{children}</button>;
}
