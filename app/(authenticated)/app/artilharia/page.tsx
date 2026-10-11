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
import { useApiData } from "@/lib/use-api-data";
import { clientApi } from "@/lib/client-api";

const PAGE_SIZE = 10;
// SportsController accepts limit values from 1 through 500.
const MAX_LIMIT = 500;

export default function TopScorersPage() {
  const { activeEventId } =
    useCompetitionBrowse();

  return <TopScorers key={activeEventId ?? "profile"} eventId={activeEventId} />;
}

function TopScorers({ eventId }: { eventId: number | null }) {
  const dataUrl = `/api/top-scorers?limit=${PAGE_SIZE}${
    eventId != null ? `&eventId=${encodeURIComponent(String(eventId))}` : ""
  }`;

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
    const params = new URLSearchParams({ limit: String(nextLimit) });
    if (eventId != null) params.set("eventId", String(eventId));

    setLoadingMore(true);
    setMoreError("");
    try {
      const result = await clientApi<TopScorer[]>(`/api/top-scorers?${params}`, {
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
      <PageIntro
        eyebrow="Quem decide"
        title="Artilharia"
        description="Os goleadores da categoria, atualizados após a conclusão de cada jogo."
      />

      <CompetitionSearch
        loading={loading}
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

                {leader.goals ?? 0} gols
                registrados na competição
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
