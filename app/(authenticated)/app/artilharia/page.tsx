"use client";

import {
  Crown,
  Target,
} from "lucide-react";

import {
  EmptyState,
  ErrorState,
  LoadingCards,
} from "@/components/feedback";

import { PageIntro } from "@/components/page-intro";
import { TeamMark } from "@/components/team-mark";
import { TopScorerList } from "@/components/top-scorer-list";

import type { TopScorer } from "@/lib/types";
import { useApiData } from "@/lib/use-api-data";

export default function TopScorersPage() {
  const {
    data,
    loading,
    error,
    reload,
  } = useApiData<TopScorer[]>(
    "/api/top-scorers",
  );

  const leader = data?.[0];

  const leaderName = leader
    ? leader.personalDataSuppressed
      ? "Atleta não exibido"
      : leader.athleteName ??
        "Atleta"
    : "";

  return (
    <div>
      <PageIntro
        eyebrow="Quem decide"
        title="Artilharia"
        description="Os goleadores da categoria, atualizados após a conclusão de cada jogo."
      />

      {loading ? (
        <LoadingCards count={5} />
      ) : error ? (
        <ErrorState
          message={error}
          onRetry={reload}
        />
      ) : !data?.length ? (
        <EmptyState
          title="Artilharia ainda vazia"
          description="Os atletas aparecerão aqui assim que os primeiros gols forem registrados."
        />
      ) : (
        <>
          {leader ? (
            <section className="relative mb-5 overflow-hidden rounded-[1.75rem] border border-amber/20 bg-gradient-to-br from-amber/16 via-panel to-night p-6">
              <Crown className="absolute -right-4 -top-5 size-32 rotate-12 text-amber/6" />

              <p className="eyebrow !text-amber">
                Líder da artilharia
              </p>

              <div className="relative mt-5 flex items-center gap-4">
                <TeamMark
                  team={leader.team}
                  size="lg"
                />

                <div className="min-w-0">
                  <h2 className="truncate text-xl font-black text-ivory sm:text-2xl">
                    {leaderName}
                  </h2>

                  <p className="text-sm text-muted">
                    {leader.team.name}

                    {leader.phase
                      ? ` • ${leader.phase}`
                      : ""}
                  </p>
                </div>

                <div className="ml-auto text-right">
                  <strong className="display-title text-5xl font-black text-amber">
                    {leader.goals ??
                      0}
                  </strong>

                  <span className="block text-[10px] font-black uppercase tracking-wider text-muted">
                    gols
                  </span>
                </div>
              </div>

              <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink/35 px-3 py-2 text-xs font-bold text-muted">
                <Target className="size-4 text-coral" />

                {leader.goals ?? 0} gols
                registrados na competição
              </div>
            </section>
          ) : null}

          <TopScorerList
            scorers={data}
          />
        </>
      )}
    </div>
  );
}