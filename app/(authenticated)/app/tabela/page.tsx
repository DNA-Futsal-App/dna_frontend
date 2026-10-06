"use client";

import { useState } from "react";
import {
  GitBranch,
  ListOrdered,
} from "lucide-react";

import {
  CompetitionSearch,
  useCompetitionBrowse,
} from "@/components/competition-search";
import {
  EmptyState,
  ErrorState,
  LoadingCards,
} from "@/components/feedback";
import {
  buildKnockoutStages,
  KnockoutBracket,
} from "@/components/knockout-bracket";
import { PageIntro } from "@/components/page-intro";
import { useProfile } from "@/components/profile-context";
import { StandingsTable } from "@/components/standings-table";
import type {
  Match,
  MatchCalendar,
  Standing,
} from "@/lib/types";
import { useApiData } from "@/lib/use-api-data";

type StandingsView =
  | "STANDINGS"
  | "KNOCKOUT";

export default function StandingsPage() {
  const { profile } = useProfile();

  const {
    activeEventId,
    isExploring,
  } = useCompetitionBrowse();

  const [tabState, setTabState] =
    useState<{
      eventId: number | null;
      view: StandingsView;
    }>({
      eventId: activeEventId,
      view: "STANDINGS",
    });

  const standingsUrl =
    activeEventId != null
      ? `/api/standings?eventId=${encodeURIComponent(
          String(activeEventId),
        )}`
      : "/api/standings";

  const matchesUrl =
    activeEventId != null
      ? `/api/matches?eventId=${encodeURIComponent(
          String(activeEventId),
        )}`
      : "/api/matches";

  const {
    data,
    loading,
    error,
    reload,
  } = useApiData<Standing[]>(
    standingsUrl,
  );

  const {
    data: calendar,
    loading: matchesLoading,
    error: matchesError,
    reload: reloadMatches,
  } = useApiData<MatchCalendar>(
    matchesUrl,
  );

  const knockoutMatches =
    calendar
      ? [
          ...calendar.played,
          ...calendar.upcoming,
          ...calendar.pendingResults,
        ]
      : [];

  const stages =
    buildKnockoutStages(
      knockoutMatches,
    );

  const hasKnockout =
    stages.length > 0;

  const selectedView =
    tabState.eventId ===
      activeEventId &&
    tabState.view === "KNOCKOUT" &&
    hasKnockout
      ? "KNOCKOUT"
      : "STANDINGS";

  const groups =
    groupStandings(
      data ?? [],
    );

  const classificationPhase =
    data?.find(
      (row) => row.phase,
    )?.phase ?? null;

  const totalTeams =
    data?.length ?? 0;

  function selectView(
    view: StandingsView,
  ) {
    setTabState({
      eventId: activeEventId,
      view,
    });
  }

  return (
    <div>
      <PageIntro
        eyebrow="Campeonato Paulista"
        title="Classificação"
        description="Veja a classificação final da fase de pontos e, quando houver mata-mata, acompanhe também o chaveamento."
      />

      <CompetitionSearch />

      {hasKnockout ? (
        <div className="mb-6 inline-flex rounded-xl border border-white/8 bg-panel p-1">
          <button
            type="button"
            onClick={() =>
              selectView(
                "STANDINGS",
              )
            }
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-black transition ${
              selectedView ===
              "STANDINGS"
                ? "bg-cyan text-night"
                : "text-muted hover:text-ivory"
            }`}
          >
            <ListOrdered className="size-4" />
            Classificação
          </button>

          <button
            type="button"
            onClick={() =>
              selectView(
                "KNOCKOUT",
              )
            }
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-black transition ${
              selectedView ===
              "KNOCKOUT"
                ? "bg-cyan text-night"
                : "text-muted hover:text-ivory"
            }`}
          >
            <GitBranch className="size-4" />
            Mata-mata
          </button>
        </div>
      ) : null}

      {selectedView ===
      "KNOCKOUT" ? (
        matchesLoading ? (
          <LoadingCards count={4} />
        ) : matchesError ? (
          <ErrorState
            message={matchesError}
            onRetry={reloadMatches}
          />
        ) : (
          <KnockoutBracket
            stages={stages}
          />
        )
      ) : loading ? (
        <LoadingCards count={5} />
      ) : error ? (
        <ErrorState
          message={error}
          onRetry={reload}
        />
      ) : !data?.length ? (
        <EmptyState
          title="Tabela ainda indisponível"
          description="A classificação aparecerá assim que a competição publicar os primeiros resultados."
        />
      ) : (
        <>
          {classificationPhase ? (
            <div className="mb-4 rounded-2xl border border-cyan/15 bg-cyan/6 px-4 py-4 text-sm text-muted">
              {hasKnockout ? (
                <div className="space-y-2">
                  <p>
                    <strong className="text-cyan">
                      Fase classificatória encerrada.
                    </strong>{" "}
                    Esta é a classificação final da fase de pontos, com todos os times retornados para a categoria.
                  </p>

                  <div className="flex flex-wrap gap-2 text-xs font-bold">
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-ivory">
                      {totalTeams} times
                    </span>

                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-ivory">
                      {groups.length} {groups.length === 1 ? "tabela" : "grupos/chaves"}
                    </span>

                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-ivory">
                      Fase: {classificationPhase}
                    </span>
                  </div>
                </div>
              ) : (
                <p>
                  Tabela da fase{" "}
                  <strong className="text-cyan">
                    {classificationPhase}
                  </strong>
                </p>
              )}
            </div>
          ) : null}

          <div className="grid gap-7">
            {groups.map(
              (group) => (
                <section
                  key={
                    group.key
                  }
                >
                  {group.label ? (
                    <h2 className="mb-3 text-sm font-black uppercase tracking-[0.12em] text-muted">
                      {group.label}
                    </h2>
                  ) : null}

                  <StandingsTable
                    standings={
                      group.rows
                    }
                    followedTeamId={
                      isExploring
                        ? undefined
                        : profile?.teamId
                    }
                  />
                </section>
              ),
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
            <span>
              <strong className="text-ivory">
                J
              </strong>{" "}
              Jogos
            </span>
            <span>
              <strong className="text-ivory">
                V
              </strong>{" "}
              Vitórias
            </span>
            <span>
              <strong className="text-ivory">
                E
              </strong>{" "}
              Empates
            </span>
            <span>
              <strong className="text-ivory">
                SG
              </strong>{" "}
              Saldo de gols
            </span>
            <span>
              <strong className="text-ivory">
                Pts
              </strong>{" "}
              Pontos
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function groupStandings(
  standings: Standing[],
) {
  const groups =
    new Map<
      string,
      Standing[]
    >();

  for (const row of standings) {
    const label =
      row.group?.trim() ||
      "";

    const current =
      groups.get(label) ??
      [];

    current.push(row);
    groups.set(
      label,
      current,
    );
  }

  return [
    ...groups.entries(),
  ]
    .sort(
      ([left], [right]) =>
        left.localeCompare(
          right,
          "pt-BR",
          {
            numeric: true,
          },
        ),
    )
    .map(
      ([label, rows]) => ({
        key:
          label ||
          "general",
        label:
          groups.size > 1
            ? label ||
              "Classificação geral"
            : label ||
              null,
        rows: rows
          .slice()
          .sort(
            (
              left,
              right,
            ) =>
              (
                left.position ??
                Number.MAX_SAFE_INTEGER
              ) -
                (
                  right.position ??
                  Number.MAX_SAFE_INTEGER
                ) ||
              left.team.name.localeCompare(
                right.team.name,
                "pt-BR",
              ),
          ),
      }),
    );
}
