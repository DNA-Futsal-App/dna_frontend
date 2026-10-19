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
import { officialMatchBracket } from "@/lib/competition-structure";
import type { CompetitionStructure } from "@/lib/competition-structure";

type StandingsView =
  | "STANDINGS"
  | "KNOCKOUT";

export default function StandingsPage() {
  const { profile } = useProfile();

  const {
    activeEventId,
    isExploring,
    stage,
  } = useCompetitionBrowse();
  const [selectedPhase, setSelectedPhase] = useState(() =>
    typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("phase") ?? "");
  const [selectedGroup, setSelectedGroup] = useState(() =>
    typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("group") ?? "");
  function chooseFilter(name: "phase" | "group", value: string) {
    if (name === "phase") { setSelectedPhase(value); setSelectedGroup(""); }
    else setSelectedGroup(value);
    const url = new URL(window.location.href);
    if (value) url.searchParams.set(name, value);
    else url.searchParams.delete(name);
    if (name === "phase") url.searchParams.delete("group");
    window.history.replaceState(null, "", url.toString());
  }
  const { data: structure } = useApiData<CompetitionStructure>(
    activeEventId != null ? `/api/sports/structure?eventId=${activeEventId}` : null,
  );
  const stageStructure = structure?.stages.find((item) => item.id === stage);
  const validPhase = stageStructure?.phases.some((item) => item.name === selectedPhase)
    ? selectedPhase : "";
  const availableGroups = stageStructure?.phases
    .filter((item) => !validPhase || item.name === validPhase)
    .flatMap((item) => item.groups) ?? [];
  const validGroup = availableGroups.includes(selectedGroup) ? selectedGroup : "";

  const [tabState, setTabState] =
    useState<{
      eventId: number | null;
      view: StandingsView;
    }>({
      eventId: activeEventId,
      view: "STANDINGS",
    });

  const standingsParams = new URLSearchParams();
  if (activeEventId != null) standingsParams.set("eventId", String(activeEventId));
  if (activeEventId != null) standingsParams.set("stage", stage);
  if (validPhase) standingsParams.set("phase", validPhase);
  if (validGroup) standingsParams.set("group", validGroup);
  const standingsUrl = `/api/standings?${standingsParams}`;

  const matchesUrl = activeEventId != null
    ? `/api/matches?eventId=${encodeURIComponent(String(activeEventId))}&stage=${stage}`
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

  const competitionKeyByTeamId = stage === "UNIAO" ? {}
    : buildCompetitionKeyMap(competitionKeys ?? [], knockoutMatches);

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
    Array.from(new Set(classifiedMatches.map((item) => item.competitionKey)
      .filter((value): value is string => value != null)))
      .sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }))
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
                .map((item) => item.match),
              stage === "UNIAO",
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
        .map((item) => item.match),
      stage === "UNIAO",
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

  const groups = groupStandings(data ?? [], stage === "UNIAO");

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
        eyebrow={stage === "UNIAO" ? "Torneio União" : "Campeonato Paulista"}
        title="Classificação"
        description="Veja a classificação final da fase de pontos e, quando houver mata-mata, acompanhe também o chaveamento."
      />

      <CompetitionSearch />
      {stageStructure ? (
        <div className="mb-5 flex flex-wrap gap-3">
          <label className="grid gap-1 text-xs text-muted">Fase
            <select className="field" value={validPhase} onChange={(event) => {
              chooseFilter("phase", event.target.value);
            }}>
              <option value="">Todas as fases</option>
              {stageStructure.phases.filter((item) => item.hasStandings).map((item) =>
                <option key={item.name} value={item.name}>{item.name}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs text-muted">Grupo / chave
            <select className="field" value={validGroup} onChange={(event) => chooseFilter("group", event.target.value)}>
              <option value="">Todos os grupos</option>
              {Array.from(new Set(availableGroups)).map((group) =>
                <option key={group} value={group}>{group}</option>)}
            </select>
          </label>
        </div>
      ) : null}

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

                  <KnockoutBracket stages={bracket.stages} inferWinner={stage !== "UNIAO"} />
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
                      {stage === "UNIAO" ? "Classificação publicada pela FPFS." : "Fase classificatória encerrada."}
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

          {stage === "PAULISTA" && competitionKeys?.length ? (
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

const COMPETITION_KEY_ORDER: CompetitionKey[] = ["GOLD", "SILVER", "BRONZE"];

const COMPETITION_KEY_META: Partial<Record<
  CompetitionKey,
  {
    label: string;
    className: string;
  }
>> = {
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
          const meta = COMPETITION_KEY_META[competitionKey] ?? {
            label: competitionKey,
            className: "border-white/15 bg-white/5 text-ivory",
          };

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
  const meta = COMPETITION_KEY_META[competitionKey] ?? {
    label: competitionKey,
    className: "border-white/15 bg-white/5 text-ivory",
  };

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

function competitionKeyForMatch(match: Match, _keyByTeamId: Partial<Record<string, CompetitionKey>>): CompetitionKey | null {
  // A team's classification bracket is not proof of the knockout tie's bracket.
  return competitionKeyFromText(match.phase);
}

function competitionKeyFromText(value?: string | null): CompetitionKey | null {
  const official = officialMatchBracket(value);
  if (!official) return null;
  const key = official.slice("Chave ".length).trim();
  if (key === "ouro") return "GOLD";
  if (key === "prata") return "SILVER";
  if (key === "bronze") return "BRONZE";
  return official;
}

function groupStandings(
  standings: Standing[],
  splitPhases = false,
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
