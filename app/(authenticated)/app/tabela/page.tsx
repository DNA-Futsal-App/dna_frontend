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
  CompetitionKey,
  CompetitionKeyEntry,
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

  const competitionKeysUrl =
    activeEventId != null
      ? `/api/standings/keys?eventId=${encodeURIComponent(
          String(activeEventId),
        )}`
      : "/api/standings/keys";

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

  const {
    data: competitionKeys,
    loading: competitionKeysLoading,
    error: competitionKeysError,
    reload: reloadCompetitionKeys,
  } = useApiData<CompetitionKeyEntry[]>(
    competitionKeysUrl,
  );

  const knockoutMatches =
    calendar
      ? [
          ...calendar.played,
          ...calendar.upcoming,
          ...calendar.pendingResults,
        ]
      : [];

  const competitionKeyByTeamId =
    buildCompetitionKeyMap(
      competitionKeys ?? [],
      knockoutMatches,
    );

  const classifiedMatches =
    knockoutMatches.map(
      (match) => ({
        match,
        competitionKey:
          competitionKeyForMatch(
            match,
            competitionKeyByTeamId,
          ),
      }),
    );

  const keyedBrackets =
    COMPETITION_KEY_ORDER
      .map(
        (competitionKey) => ({
          competitionKey,
          stages:
            buildKnockoutStages(
              classifiedMatches
                .filter(
                  (item) =>
                    item.competitionKey ===
                    competitionKey,
                )
                .map(
                  (item) =>
                    item.match,
                ),
            ),
        }),
      )
      .filter(
        (item) =>
          item.stages.length >
          0,
      );

  const unassignedStages =
    buildKnockoutStages(
      classifiedMatches
        .filter(
          (item) =>
            item.competitionKey ==
            null,
        )
        .map(
          (item) =>
            item.match,
        ),
    );

  const brackets =
    keyedBrackets.length
      ? [
          ...keyedBrackets,
          ...(unassignedStages.length
            ? [
                {
                  competitionKey:
                    null,
                  stages:
                    unassignedStages,
                },
              ]
            : []),
        ]
      : unassignedStages.length
        ? [
            {
              competitionKey:
                null,
              stages:
                unassignedStages,
            },
          ]
        : [];

  const hasKnockout =
    brackets.length > 0;

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
        matchesLoading ||
        competitionKeysLoading ? (
          <LoadingCards count={4} />
        ) : matchesError ||
          competitionKeysError ? (
          <ErrorState
            message={
              matchesError ||
              competitionKeysError
            }
            onRetry={() => {
              void reloadMatches();
              void reloadCompetitionKeys();
            }}
          />
        ) : (
          <div className="grid gap-10">
            {brackets.map(
              (bracket) => (
                <section
                  key={
                    bracket.competitionKey ??
                    "UNASSIGNED"
                  }
                  className="grid gap-4"
                >
                  {bracket.competitionKey ? (
                    <CompetitionKeyHeading
                      competitionKey={
                        bracket.competitionKey
                      }
                    />
                  ) : keyedBrackets.length ? (
                    <div className="w-fit rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-black text-muted">
                      Outros confrontos
                    </div>
                  ) : null}

                  <KnockoutBracket
                    stages={
                      bracket.stages
                    }
                  />
                </section>
              ),
            )}
          </div>
        )
      ) : loading ||
        competitionKeysLoading ? (
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

          {competitionKeys?.length ? (
            <CompetitionKeyLegend />
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
                    competitionKeyByTeamId={
                      competitionKeyByTeamId
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

const COMPETITION_KEY_ORDER:
  CompetitionKey[] = [
    "GOLD",
    "SILVER",
    "BRONZE",
  ];

const COMPETITION_KEY_META: Record<
  CompetitionKey,
  {
    label: string;
    className: string;
  }
> = {
  GOLD: {
    label: "Chave Ouro",
    className:
      "border-amber/30 bg-amber/10 text-amber",
  },
  SILVER: {
    label: "Chave Prata",
    className:
      "border-slate-300/25 bg-slate-300/10 text-slate-200",
  },
  BRONZE: {
    label: "Chave Bronze",
    className:
      "border-orange-400/30 bg-orange-400/10 text-orange-300",
  },
};

function CompetitionKeyLegend() {
  return (
    <div className="mb-5 flex flex-wrap gap-2">
      {COMPETITION_KEY_ORDER.map(
        (competitionKey) => {
          const meta =
            COMPETITION_KEY_META[
              competitionKey
            ];

          return (
            <span
              key={
                competitionKey
              }
              className={`rounded-full border px-3 py-1.5 text-xs font-black ${meta.className}`}
            >
              {meta.label}
            </span>
          );
        },
      )}
    </div>
  );
}

function CompetitionKeyHeading({
  competitionKey,
}: {
  competitionKey: CompetitionKey;
}) {
  const meta =
    COMPETITION_KEY_META[
      competitionKey
    ];

  return (
    <div
      className={`inline-flex w-fit items-center rounded-full border px-4 py-2 text-sm font-black ${meta.className}`}
    >
      {meta.label}
    </div>
  );
}

function buildCompetitionKeyMap(
  entries: CompetitionKeyEntry[],
  matches: Match[],
) {
  const result:
    Partial<
      Record<
        string,
        CompetitionKey
      >
    > = {};

  for (const entry of entries) {
    result[
      entry.teamId
    ] = entry.key;
  }

  /*
   * Complementa o mapa com o nome da fase do jogo quando a FPFS
   * fornece a chave diretamente ali. Isso evita perder o segundo
   * clube de tabelas que usam célula mesclada/rowspan para "Chave".
   */
  for (const match of matches) {
    const key =
      competitionKeyFromText(
        match.phase,
      );

    if (!key) {
      continue;
    }

    result[
      match.homeTeam.id
    ] = key;

    result[
      match.awayTeam.id
    ] = key;
  }

  return result;
}

function competitionKeyForMatch(
  match: Match,
  keyByTeamId: Partial<
    Record<
      string,
      CompetitionKey
    >
  >,
): CompetitionKey | null {
  const keyFromPhase =
    competitionKeyFromText(
      match.phase,
    );

  if (keyFromPhase) {
    return keyFromPhase;
  }

  const homeKey =
    keyByTeamId[
      match.homeTeam.id
    ];

  const awayKey =
    keyByTeamId[
      match.awayTeam.id
    ];

  if (
    homeKey &&
    awayKey &&
    homeKey === awayKey
  ) {
    return homeKey;
  }

  return (
    homeKey ??
    awayKey ??
    null
  );
}

function competitionKeyFromText(
  value?: string | null,
): CompetitionKey | null {
  const normalized =
    (value ?? "")
      .normalize("NFD")
      .replace(
        /\p{M}/gu,
        "",
      )
      .toLowerCase();

  if (
    normalized.includes(
      "ouro",
    )
  ) {
    return "GOLD";
  }

  if (
    normalized.includes(
      "prata",
    )
  ) {
    return "SILVER";
  }

  if (
    normalized.includes(
      "bronze",
    )
  ) {
    return "BRONZE";
  }

  return null;
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
