import {
  CalendarDays,
  Trophy,
} from "lucide-react";

import { TeamMark } from "@/components/team-mark";
import type {
  Match,
  Team,
} from "@/lib/types";

export type KnockoutStage = {
  key:
    | "ROUND_OF_16"
    | "QUARTER_FINAL"
    | "SEMI_FINAL"
    | "FINAL";
  label: string;
  order: number;
  ties: KnockoutTie[];
};

type KnockoutTie = {
  key: string;
  teams: [
    KnockoutTeam,
    KnockoutTeam,
  ];
  matches: Match[];
  complete: boolean;
};

type KnockoutTeam = {
  team: Team;
  score: number | null;
};

type StageDefinition = {
  key: KnockoutStage["key"];
  label: string;
  order: number;
};

type TiePosition = {
  stageIndex: number;
  tieIndex: number;
  x: number;
  y: number;
  centerY: number;
};

type BracketConnection = {
  key: string;
  from: TiePosition;
  to: TiePosition;
};

const STAGES: StageDefinition[] = [
  {
    key: "ROUND_OF_16",
    label: "Oitavas de final",
    order: 10,
  },
  {
    key: "QUARTER_FINAL",
    label: "Quartas de final",
    order: 20,
  },
  {
    key: "SEMI_FINAL",
    label: "Semifinal",
    order: 30,
  },
  {
    key: "FINAL",
    label: "Final",
    order: 40,
  },
];

const CARD_WIDTH = 320;
const CARD_HEIGHT = 168;
const COLUMN_GAP = 96;
const ROW_GAP = 36;
const HEADER_HEIGHT = 64;
const CHAMPION_WIDTH = 220;

export function buildKnockoutStages(
  matches: Match[],
): KnockoutStage[] {
  const stages =
    new Map<
      KnockoutStage["key"],
      Match[]
    >();

  for (const match of matches) {
    const stage =
      stageForPhase(
        match.phase,
      );

    if (!stage) {
      continue;
    }

    const current =
      stages.get(stage.key) ??
      [];

    current.push(match);
    stages.set(
      stage.key,
      current,
    );
  }

  const ordered =
    STAGES
      .filter((stage) =>
        stages.has(stage.key),
      )
      .map((stage) => ({
        ...stage,
        ties: buildTies(
          stages.get(stage.key) ??
            [],
        ),
      }))
      .filter(
        (stage) =>
          stage.ties.length > 0,
      );

  for (
    let index = 1;
    index < ordered.length;
    index++
  ) {
    const previous =
      ordered[index - 1];

    ordered[index] = {
      ...ordered[index],
      ties: orderByPreviousStage(
        ordered[index].ties,
        previous.ties,
      ),
    };
  }

  return ordered;
}

export function KnockoutBracket({
  stages,
}: {
  stages: KnockoutStage[];
}) {
  if (!stages.length) {
    return null;
  }

  const positions =
    buildBracketPositions(
      stages,
    );

  const connections =
    buildConnections(
      stages,
      positions,
    );

  const firstStageHeight =
    Math.max(
      CARD_HEIGHT,
      stages[0].ties.length *
        CARD_HEIGHT +
        Math.max(
          0,
          stages[0].ties.length -
            1,
        ) *
          ROW_GAP,
    );

  const bracketHeight =
    HEADER_HEIGHT +
    firstStageHeight;

  const champion =
    resolveChampion(
      stages[
        stages.length - 1
      ],
    );

  const bracketWidth =
    stages.length *
      CARD_WIDTH +
    Math.max(
      0,
      stages.length - 1,
    ) *
      COLUMN_GAP +
    (champion
      ? COLUMN_GAP +
        CHAMPION_WIDTH
      : 0);

  return (
    <section className="grid gap-5">
      <div className="rounded-2xl border border-white/8 bg-panel/60 px-4 py-4 text-sm text-muted">
        <p>
          <strong className="text-cyan">
            Chaveamento do mata-mata.
          </strong>{" "}
          As linhas mostram de qual confronto sai cada classificado para o jogo da fase seguinte.
        </p>
      </div>

      <div className="overflow-x-auto pb-5">
        <div
          className="relative min-w-max"
          style={{
            width: `${bracketWidth}px`,
            height: `${bracketHeight}px`,
          }}
        >
          <StageHeaders
            stages={stages}
          />

          <svg
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 overflow-visible text-white/20"
            width={bracketWidth}
            height={bracketHeight}
            viewBox={`0 0 ${bracketWidth} ${bracketHeight}`}
          >
            {connections.map(
              (connection) => {
                const fromX =
                  connection.from.x +
                  CARD_WIDTH;
                const fromY =
                  HEADER_HEIGHT +
                  connection.from.centerY;
                const toX =
                  connection.to.x;
                const toY =
                  HEADER_HEIGHT +
                  connection.to.centerY;
                const middleX =
                  fromX +
                  (
                    toX -
                    fromX
                  ) /
                    2;

                return (
                  <path
                    key={
                      connection.key
                    }
                    d={[
                      `M ${fromX} ${fromY}`,
                      `H ${middleX}`,
                      `V ${toY}`,
                      `H ${toX}`,
                    ].join(" ")}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                  />
                );
              },
            )}

            {champion ? (
              <ChampionConnector
                stages={stages}
                positions={
                  positions
                }
              />
            ) : null}
          </svg>

          {stages.flatMap(
            (
              stage,
              stageIndex,
            ) =>
              stage.ties.map(
                (
                  tie,
                  tieIndex,
                ) => {
                  const position =
                    positions[
                      stageIndex
                    ][tieIndex];

                  return (
                    <div
                      key={`${stage.key}:${tie.key}`}
                      className="absolute"
                      style={{
                        left: `${position.x}px`,
                        top: `${
                          HEADER_HEIGHT +
                          position.y
                        }px`,
                        width: `${CARD_WIDTH}px`,
                        height: `${CARD_HEIGHT}px`,
                      }}
                    >
                      <TieCard
                        tie={tie}
                        advancedTeamId={
                          advancedTeamId(
                            tie,
                            stages[
                              stageIndex +
                                1
                            ],
                          )
                        }
                      />
                    </div>
                  );
                },
              ),
          )}

          {champion ? (
            <ChampionPanel
              champion={champion}
              left={
                stages.length *
                  CARD_WIDTH +
                Math.max(
                  0,
                  stages.length - 1,
                ) *
                  COLUMN_GAP +
                COLUMN_GAP
              }
              top={
                HEADER_HEIGHT +
                (
                  positions[
                    stages.length -
                      1
                  ]?.[0]
                    ?.centerY ??
                  firstStageHeight /
                    2
                ) -
                95
              }
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}

function StageHeaders({
  stages,
}: {
  stages: KnockoutStage[];
}) {
  return (
    <>
      {stages.map(
        (
          stage,
          index,
        ) => (
          <div
            key={
              stage.key
            }
            className="absolute top-0"
            style={{
              left: `${
                index *
                (
                  CARD_WIDTH +
                  COLUMN_GAP
                )
              }px`,
              width: `${CARD_WIDTH}px`,
            }}
          >
            <h2 className="text-sm font-black uppercase tracking-[0.14em] text-cyan">
              {stage.label}
            </h2>

            <p className="mt-1 text-xs text-muted">
              {stage.ties.length}{" "}
              {stage.ties.length ===
              1
                ? "confronto"
                : "confrontos"}
            </p>
          </div>
        ),
      )}
    </>
  );
}

function ChampionConnector({
  stages,
  positions,
}: {
  stages: KnockoutStage[];
  positions: TiePosition[][];
}) {
  const finalStageIndex =
    stages.length - 1;

  const finalPosition =
    positions[
      finalStageIndex
    ]?.[0];

  if (!finalPosition) {
    return null;
  }

  const fromX =
    finalPosition.x +
    CARD_WIDTH;
  const fromY =
    HEADER_HEIGHT +
    finalPosition.centerY;
  const toX =
    stages.length *
      CARD_WIDTH +
    Math.max(
      0,
      stages.length - 1,
    ) *
      COLUMN_GAP +
    COLUMN_GAP;

  return (
    <path
      d={`M ${fromX} ${fromY} H ${toX}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      vectorEffect="non-scaling-stroke"
    />
  );
}

function TieCard({
  tie,
  advancedTeamId,
}: {
  tie: KnockoutTie;
  advancedTeamId: string | null;
}) {
  const [
    first,
    second,
  ] = tie.teams;

  const winner =
    advancedTeamId ??
    winnerOfTie(
      tie,
    )?.team.id ??
    null;

  return (
    <article className="h-full overflow-hidden rounded-2xl border border-white/10 bg-white shadow-[0_12px_30px_rgba(0,0,0,0.22)]">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-500">
        <span>
          {tie.matches.length > 1
            ? `${tie.matches.length} jogos`
            : matchLabel(
                tie.matches[0],
              )}
        </span>

        <span>
          {tie.complete
            ? "Encerrado"
            : "Em disputa"}
        </span>
      </div>

      <TeamRow
        item={first}
        winner={
          winner ===
          first.team.id
        }
      />

      <div className="border-t border-slate-200" />

      <TeamRow
        item={second}
        winner={
          winner ===
          second.team.id
        }
      />

      <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-3 py-2 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1">
          <CalendarDays className="size-3" />
          {tie.matches.length > 1
            ? aggregateDates(
                tie.matches,
              )
            : matchDate(
                tie.matches[0],
              )}
        </span>

        {tie.matches.some(
          (match) =>
            match.walkover,
        ) ? (
          <strong className="text-amber-600">
            W.O.
          </strong>
        ) : null}
      </div>
    </article>
  );
}

function TeamRow({
  item,
  winner,
}: {
  item: KnockoutTeam;
  winner: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-3 py-3 ${
        winner
          ? "bg-cyan/10"
          : "bg-white"
      }`}
    >
      <TeamMark
        team={item.team}
        size="sm"
      />

      <span
        className={`min-w-0 flex-1 truncate text-sm ${
          winner
            ? "font-black text-slate-950"
            : "font-bold text-slate-700"
        }`}
      >
        {item.team.name}
      </span>

      <strong className="text-xl text-slate-950">
        {item.score ??
          "—"}
      </strong>
    </div>
  );
}

function ChampionPanel({
  champion,
  left,
  top,
}: {
  champion: {
    team: Team;
    season: number | null;
  };
  left: number;
  top: number;
}) {
  return (
    <section
      className="absolute w-[220px]"
      style={{
        left: `${left}px`,
        top: `${Math.max(
          HEADER_HEIGHT,
          top,
        )}px`,
      }}
    >
      <div className="rounded-[1.75rem] border-4 border-coral/70 bg-coral px-5 py-6 text-center text-white shadow-[0_18px_45px_rgba(0,0,0,0.3)]">
        <div className="text-4xl font-black leading-none">
          {champion.season ??
            "—"}
        </div>

        <div className="mx-auto mt-4 flex size-20 items-center justify-center rounded-2xl border border-white/30 bg-white/10">
          <TeamMark
            team={
              champion.team
            }
            size="lg"
          />
        </div>

        <div className="mt-5 inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em]">
          <Trophy className="size-4" />
          Campeão
        </div>

        <p className="mt-2 text-balance text-lg font-black leading-tight">
          {champion.team.name}
        </p>
      </div>
    </section>
  );
}

function buildBracketPositions(
  stages: KnockoutStage[],
): TiePosition[][] {
  const result:
    TiePosition[][] = [];

  const firstStage =
    stages[0];

  result[0] =
    firstStage.ties.map(
      (
        _tie,
        tieIndex,
      ) => {
        const y =
          tieIndex *
          (
            CARD_HEIGHT +
            ROW_GAP
          );

        return {
          stageIndex: 0,
          tieIndex,
          x: 0,
          y,
          centerY:
            y +
            CARD_HEIGHT / 2,
        };
      },
    );

  for (
    let stageIndex = 1;
    stageIndex <
    stages.length;
    stageIndex++
  ) {
    const stage =
      stages[
        stageIndex
      ];
    const previousStage =
      stages[
        stageIndex - 1
      ];
    const previousPositions =
      result[
        stageIndex - 1
      ];

    result[
      stageIndex
    ] =
      stage.ties.map(
        (
          tie,
          tieIndex,
        ) => {
          const sources =
            fallbackSourcePositions(
              previousPositions,
              tieIndex,
              stage.ties.length,
            );

          const centerY =
            sources.length
              ? sources.reduce(
                  (
                    sum,
                    item,
                  ) =>
                    sum +
                    item.centerY,
                  0,
                ) /
                sources.length
              : CARD_HEIGHT /
                2;

          return {
            stageIndex,
            tieIndex,
            x:
              stageIndex *
              (
                CARD_WIDTH +
                COLUMN_GAP
              ),
            y:
              centerY -
              CARD_HEIGHT /
                2,
            centerY,
          };
        },
      );
  }

  return result;
}

function fallbackSourcePositions(
  previous: TiePosition[],
  targetIndex: number,
  targetCount: number,
) {
  if (
    !previous.length ||
    targetCount <= 0
  ) {
    return [];
  }

  const start =
    Math.floor(
      targetIndex *
        previous.length /
        targetCount,
    );
  const end =
    Math.max(
      start + 1,
      Math.floor(
        (
          targetIndex +
          1
        ) *
          previous.length /
          targetCount,
      ),
    );

  return previous.slice(
    start,
    end,
  );
}

function buildConnections(
  stages: KnockoutStage[],
  positions: TiePosition[][],
): BracketConnection[] {
  const connections:
    BracketConnection[] = [];

  for (
    let stageIndex = 0;
    stageIndex <
    stages.length - 1;
    stageIndex++
  ) {
    const sourceStage =
      stages[
        stageIndex
      ];
    const targetStage =
      stages[
        stageIndex + 1
      ];

    sourceStage.ties.forEach(
      (
        sourceTie,
        sourceIndex,
      ) => {
        let targetIndex =
          targetStage.ties.findIndex(
            (targetTie) =>
              tiesShareTeam(
                sourceTie,
                targetTie,
              ),
          );

        if (
          targetIndex < 0
        ) {
          targetIndex =
            Math.min(
              targetStage.ties.length -
                1,
              Math.floor(
                sourceIndex *
                  targetStage.ties.length /
                  Math.max(
                    1,
                    sourceStage.ties.length,
                  ),
              ),
            );
        }

        if (
          targetIndex < 0 ||
          !positions[
            stageIndex
          ]?.[
            sourceIndex
          ] ||
          !positions[
            stageIndex + 1
          ]?.[
            targetIndex
          ]
        ) {
          return;
        }

        connections.push({
          key:
            `${sourceStage.key}:${sourceTie.key}->${targetStage.key}:${targetStage.ties[targetIndex].key}`,
          from:
            positions[
              stageIndex
            ][sourceIndex],
          to:
            positions[
              stageIndex + 1
            ][targetIndex],
        });
      },
    );
  }

  return connections;
}

function orderByPreviousStage(
  ties: KnockoutTie[],
  previous: KnockoutTie[],
) {
  return ties
    .slice()
    .sort(
      (
        left,
        right,
      ) => {
        const leftSource =
          firstSourceIndex(
            left,
            previous,
          );
        const rightSource =
          firstSourceIndex(
            right,
            previous,
          );

        if (
          leftSource !==
          rightSource
        ) {
          return (
            leftSource -
            rightSource
          );
        }

        return matchSortValue(
          left.matches[0],
        ).localeCompare(
          matchSortValue(
            right.matches[0],
          ),
        );
      },
    );
}

function firstSourceIndex(
  target: KnockoutTie,
  previous: KnockoutTie[],
) {
  const index =
    previous.findIndex(
      (source) =>
        tiesShareTeam(
          source,
          target,
        ),
    );

  return index < 0
    ? Number.MAX_SAFE_INTEGER
    : index;
}

function advancedTeamId(
  tie: KnockoutTie,
  nextStage?: KnockoutStage,
) {
  if (!nextStage) {
    return null;
  }

  const candidates =
    tie.teams
      .map(
        (item) =>
          item.team.id,
      )
      .filter((teamId) =>
        nextStage.ties.some(
          (nextTie) =>
            tieHasTeam(
              nextTie,
              teamId,
            ),
        ),
      );

  return candidates.length ===
    1
    ? candidates[0]
    : null;
}

function tiesShareTeam(
  first: KnockoutTie,
  second: KnockoutTie,
) {
  return first.teams.some(
    (item) =>
      tieHasTeam(
        second,
        item.team.id,
      ),
  );
}

function tieHasTeam(
  tie: KnockoutTie,
  teamId: string,
) {
  return tie.teams.some(
    (item) =>
      item.team.id ===
      teamId,
  );
}

function buildTies(
  matches: Match[],
): KnockoutTie[] {
  const grouped =
    new Map<
      string,
      Match[]
    >();

  for (const match of matches) {
    const key =
      pairKey(match);

    const current =
      grouped.get(key) ??
      [];

    current.push(match);
    grouped.set(
      key,
      current,
    );
  }

  return [
    ...grouped.entries(),
  ]
    .map(
      ([key, games]) =>
        buildTie(
          key,
          games,
        ),
    )
    .sort(
      (
        left,
        right,
      ) =>
        matchSortValue(
          left.matches[0],
        ).localeCompare(
          matchSortValue(
            right.matches[0],
          ),
        ),
    );
}

function buildTie(
  key: string,
  games: Match[],
): KnockoutTie {
  const teamById =
    new Map<string, Team>();

  for (const game of games) {
    teamById.set(
      game.homeTeam.id,
      game.homeTeam,
    );
    teamById.set(
      game.awayTeam.id,
      game.awayTeam,
    );
  }

  const teams = [
    ...teamById.values(),
  ];

  const first =
    teams[0] ??
    games[0].homeTeam;

  const second =
    teams[1] ??
    games[0].awayTeam;

  return {
    key,
    teams: [
      {
        team: first,
        score:
          aggregateScore(
            first.id,
            games,
          ),
      },
      {
        team: second,
        score:
          aggregateScore(
            second.id,
            games,
          ),
      },
    ],
    matches: games
      .slice()
      .sort(
        (
          left,
          right,
        ) =>
          matchSortValue(
            left,
          ).localeCompare(
            matchSortValue(
              right,
            ),
          ),
      ),
    complete:
      games.length > 0 &&
      games.every(
        (game) =>
          game.homeScore !=
            null &&
          game.awayScore !=
            null,
      ),
  };
}

function aggregateScore(
  teamId: string,
  matches: Match[],
) {
  let total = 0;
  let hasScore = false;

  for (const match of matches) {
    if (
      match.homeTeam.id ===
        teamId &&
      match.homeScore != null
    ) {
      total +=
        match.homeScore;
      hasScore = true;
    }

    if (
      match.awayTeam.id ===
        teamId &&
      match.awayScore != null
    ) {
      total +=
        match.awayScore;
      hasScore = true;
    }
  }

  return hasScore
    ? total
    : null;
}

function pairKey(
  match: Match,
) {
  return [
    teamKey(
      match.homeTeam,
    ),
    teamKey(
      match.awayTeam,
    ),
  ]
    .sort()
    .join("|");
}

function teamKey(
  team: Team,
) {
  return (
    team.id ||
    normalize(
      team.name,
    )
  );
}

function stageForPhase(
  phase?: string | null,
): StageDefinition | null {
  const value =
    normalize(phase);

  if (
    value.includes(
      "oitav",
    )
  ) {
    return STAGES[0];
  }

  if (
    value.includes(
      "quart",
    )
  ) {
    return STAGES[1];
  }

  if (
    value.includes(
      "semifinal",
    ) ||
    value.includes(
      "semi final",
    )
  ) {
    return STAGES[2];
  }

  if (
    value === "final" ||
    value.endsWith(
      " final",
    )
  ) {
    return STAGES[3];
  }

  return null;
}

function normalize(
  value?: string | null,
) {
  return (value ?? "")
    .replaceAll(
      "ª",
      "a",
    )
    .replaceAll(
      "º",
      "o",
    )
    .normalize("NFD")
    .replace(
      /\p{M}/gu,
      "",
    )
    .toLowerCase()
    .replace(
      /[^\p{L}\p{N}]+/gu,
      " ",
    )
    .replace(
      /\s+/g,
      " ",
    )
    .trim();
}

function matchSortValue(
  match?: Match,
) {
  return [
    match?.scheduledDate ??
      "",
    match?.scheduledAt ??
      "",
    match?.id ??
      "",
  ].join("|");
}

function matchLabel(
  match?: Match,
) {
  return match?.id
    ? `Partida ${match.id}`
    : "Confronto";
}

function matchDate(
  match?: Match,
) {
  const value =
    match?.scheduledDate;

  if (!value) {
    return "Data a definir";
  }

  const [
    year,
    month,
    day,
  ] = value.split("-");

  if (
    !year ||
    !month ||
    !day
  ) {
    return value;
  }

  return `${day}/${month}`;
}

function aggregateDates(
  matches: Match[],
) {
  const values =
    matches.map(
      (match) =>
        matchDate(
          match,
        ),
    );

  return values.length
    ? values.join(" • ")
    : "Datas a definir";
}

function winnerOfTie(
  tie: KnockoutTie,
) {
  const [
    first,
    second,
  ] = tie.teams;

  if (
    first.score == null ||
    second.score == null ||
    first.score ===
      second.score
  ) {
    return null;
  }

  return first.score >
    second.score
    ? first
    : second;
}

function resolveChampion(
  stage?: KnockoutStage,
) {
  if (
    !stage ||
    stage.key !== "FINAL"
  ) {
    return null;
  }

  const finalTie =
    stage.ties[0];

  if (!finalTie) {
    return null;
  }

  const winner =
    winnerOfTie(
      finalTie,
    );

  if (!winner) {
    return null;
  }

  return {
    team: winner.team,
    season:
      finalTie.matches[0]
        ?.season ?? null,
  };
}
