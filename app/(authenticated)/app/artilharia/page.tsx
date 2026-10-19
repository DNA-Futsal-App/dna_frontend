"use client";

import {
  Crown,
  LoaderCircle,
  Target,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  EmptyState,
  ErrorState,
  LoadingCards,
} from "@/components/feedback";

import { PageIntro } from "@/components/page-intro";
import { AthleteAvatar } from "@/components/athlete-avatar";
import { TeamMark } from "@/components/team-mark";
import { TopScorerList } from "@/components/top-scorer-list";
import {
  CompetitionSearch,
  useCompetitionBrowse,
} from "@/components/competition-search";

import type { TopScorer } from "@/lib/types";
import type { CompetitionStructure } from "@/lib/competition-structure";
import { useApiData } from "@/lib/use-api-data";
import { clientApi } from "@/lib/client-api";
import { hasKnockoutScorers, topScorersUrl, type ScorerScope } from "@/lib/top-scorers-query";

const PAGE_SIZE = 10;
// SportsController accepts limit values from 1 through 500.
const MAX_LIMIT = 500;

export default function TopScorersPage() {
  const { activeEventId, stage } = useCompetitionBrowse();
  return <TopScorers key={`${activeEventId ?? "profile"}:${stage}`} eventId={activeEventId} stage={stage} />;
}

function TopScorers({ eventId, stage }: { eventId: number | null; stage: string }) {
  const { data: structure } = useApiData<CompetitionStructure>(
    eventId != null ? `/api/sports/structure?eventId=${eventId}` : null,
  );
  const [selectedPhase, setSelectedPhase] = useState(() =>
    typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("phase") ?? "");
  function choosePhase(value: string) {
    setSelectedPhase(value);
    const url = new URL(window.location.href);
    if (value) url.searchParams.set("phase", value);
    else url.searchParams.delete("phase");
    window.history.replaceState(null, "", url.toString());
  }
  const phases = structure?.stages.find((item) => item.id === stage)?.phases
    .filter((item) => item.hasScorers) ?? [];
  const phase = phases.some((item) => item.name === selectedPhase) ? selectedPhase : "";
  const [scope, setScope] = useState<ScorerScope>("general");
  const { data: knockoutScorers, error: phasesError, loading: checkingPhases, reload: checkPhases } =
    useApiData<TopScorer[]>(topScorersUrl(eventId, "knockout", 1, phase, eventId != null && stage === "UNIAO" ? stage : undefined));
  const hasKnockout = hasKnockoutScorers(knockoutScorers);

  return (
    <div>
      <PageIntro
        eyebrow="Quem decide"
        title="Artilharia"
        description="Os goleadores da categoria, atualizados após a conclusão de cada jogo."
      />
      <CompetitionSearch />
      {stage === "UNIAO" ? (
        <label className="mb-5 grid max-w-sm gap-1 text-xs text-muted">Fase com artilharia oficial
          <select className="field" value={phase} onChange={(event) => choosePhase(event.target.value)}>
            <option value="">Todas as fases disponíveis</option>
            {phases.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
          </select>
        </label>
      ) : null}

      {hasKnockout && stage !== "UNIAO" ? (
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-full border border-white/10 bg-ink/35 p-1" role="group" aria-label="Recorte da artilharia">
            {([
              { value: "general", label: "Geral" },
              { value: "knockout", label: "Mata-mata" },
            ] as const).map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={scope === option.value}
                aria-controls="scorer-ranking"
                onClick={() => setScope(option.value)}
                className={`min-h-10 rounded-full px-4 py-2 text-sm font-black transition ${
                  scope === option.value ? "bg-cyan text-ink" : "text-muted hover:text-ivory"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted">
            {scope === "knockout" ? "Gols registrados no mata-mata." : "Classificação geral de artilharia."}
          </p>
        </div>
      ) : null}

      {phasesError ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted" role="status">
          Não foi possível verificar a artilharia do mata-mata.
          <button type="button" className="font-bold text-cyan hover:underline" disabled={checkingPhases} onClick={checkPhases}>
            Tentar novamente
          </button>
        </div>
      ) : null}

      <div id="scorer-ranking">
        <ScorerRanking key={`${scope}:${phase}:${stage}`} eventId={eventId} scope={scope}
          phase={phase} stage={stage} />
      </div>
    </div>
  );
}

function ScorerRanking({ eventId, scope, phase, stage }: {
  eventId: number | null; scope: ScorerScope; phase: string; stage: string;
}) {
  const dataUrl = topScorersUrl(eventId, scope, PAGE_SIZE, phase, eventId != null && stage === "UNIAO" ? stage : undefined);

  const {
    data: initialData,
    loading,
    error,
    reload,
  } = useApiData<TopScorer[]>(
    dataUrl,
  );

  const [expandedData, setExpandedData] = useState<TopScorer[] | null>(null);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState("");
  const [exhausted, setExhausted] = useState(false);
  const pendingRequest = useRef<AbortController | null>(null);
  const data = expandedData ?? initialData;
  const canLoadMore = !exhausted && limit < MAX_LIMIT && (data?.length ?? 0) >= limit;

  useEffect(() => () => pendingRequest.current?.abort(), []);

  async function loadMore() {
    if (!data || !canLoadMore || pendingRequest.current) return;

    const controller = new AbortController();
    pendingRequest.current = controller;
    const nextLimit = Math.min(limit + PAGE_SIZE, MAX_LIMIT);

    setLoadingMore(true);
    setMoreError("");
    try {
      const result = await clientApi<TopScorer[]>(topScorersUrl(eventId, scope, nextLimit, phase, eventId != null && stage === "UNIAO" ? stage : undefined), {
        cache: "no-store",
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;

      // Each response contains the complete top N, not the next page.
      // Replace the snapshot to retain the backend's ranking without duplicates.
      setExpandedData(result);
      setLimit(nextLimit);
      setExhausted(result.length < nextLimit);
    } catch (err) {
      if (controller.signal.aborted) return;
      setMoreError(err instanceof Error ? err.message : "Não foi possível carregar mais atletas.");
    } finally {
      if (!controller.signal.aborted) {
        pendingRequest.current = null;
        setLoadingMore(false);
      }
    }
  }

  const leader = data?.[0];

  const leaderName = leader
    ? leader.personalDataSuppressed
      ? "Atleta não exibido"
      : leader.athleteName ??
        "Atleta"
    : "";

  return (
    <div>
      {loading ? (
        <LoadingCards count={5} />
      ) : error ? (
        <ErrorState
          message={error}
          onRetry={reload}
        />
      ) : !data?.length ? (
        <EmptyState
          title={scope === "knockout" ? "Artilharia do mata-mata ainda vazia" : "Artilharia geral ainda vazia"}
          description="Os atletas aparecerão aqui assim que os primeiros gols deste recorte forem registrados."
        />
      ) : (
        <>
          {leader ? (
            <section className="relative mb-5 overflow-hidden rounded-[1.75rem] border border-amber/20 bg-gradient-to-br from-amber/16 via-panel to-night p-6">
              <Crown className="absolute -right-4 -top-5 size-32 rotate-12 text-amber/6" />

              <p className="eyebrow !text-amber">
                {scope === "knockout" ? "Líder da artilharia do mata-mata" : "Líder da artilharia geral"}
              </p>

              <div className="relative mt-5 flex items-center gap-4">
                <AthleteAvatar
                  imageUrl={leader.athleteImageUrl ?? null}
                  personalDataSuppressed={leader.personalDataSuppressed}
                  size="lg"
                />

                <div className="min-w-0">
                  <h2 className="truncate text-xl font-black text-ivory sm:text-2xl">
                    {leaderName}
                  </h2>

                  <p className="flex min-w-0 items-center gap-1.5 text-sm text-muted">
                    <TeamMark team={leader.team} size="xs" />
                    <span className="truncate">{leader.team.name}

                    {leader.phase
                      ? ` • ${leader.phase}`
                      : ""}</span>
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

                {leader.goals ?? 0} gols{" "}
                {scope === "knockout" ? "registrados no mata-mata" : "registrados na classificação geral"}
              </div>
            </section>
          ) : null}

          <div id="top-scorers-list" aria-busy={loadingMore}>
            <TopScorerList scorers={data} />
          </div>

          <div className="mt-5 flex flex-col items-center gap-3">
            {moreError ? (
              <p className="text-center text-sm text-coral" role="alert">{moreError}</p>
            ) : null}
            {canLoadMore ? (
              <button
                type="button"
                className="btn-ghost w-full sm:w-auto"
                onClick={() => void loadMore()}
                disabled={loadingMore}
                aria-controls="top-scorers-list"
              >
                {loadingMore ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
                {loadingMore ? "Carregando..." : "Ver mais"}
              </button>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
