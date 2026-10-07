import { TeamMark } from "@/components/team-mark";
import type {
  CompetitionKey,
  Standing,
} from "@/lib/types";

const KEY_META: Record<
  CompetitionKey,
  {
    label: string;
    rowClass: string;
    badgeClass: string;
    positionClass: string;
  }
> = {
  GOLD: {
    label: "Ouro",
    rowClass:
      "border-l-[3px] border-l-amber/80",
    badgeClass:
      "border-amber/30 bg-amber/10 text-amber",
    positionClass:
      "text-amber",
  },
  SILVER: {
    label: "Prata",
    rowClass:
      "border-l-[3px] border-l-slate-300/70",
    badgeClass:
      "border-slate-300/25 bg-slate-300/10 text-slate-200",
    positionClass:
      "text-slate-300",
  },
  BRONZE: {
    label: "Bronze",
    rowClass:
      "border-l-[3px] border-l-orange-400/80",
    badgeClass:
      "border-orange-400/30 bg-orange-400/10 text-orange-300",
    positionClass:
      "text-orange-300",
  },
};

export function StandingsTable({
  standings,
  followedTeamId,
  competitionKeyByTeamId,
  limit,
}: {
  standings: Standing[];
  followedTeamId?: string | null;
  competitionKeyByTeamId?: Partial<
    Record<string, CompetitionKey>
  >;
  limit?: number;
}) {
  const rows =
    typeof limit === "number"
      ? standings.slice(0, limit)
      : standings;

  return (
    <div className="surface overflow-hidden rounded-2xl">
      <div className="grid grid-cols-[2rem_1fr_2.1rem_2.1rem_2.4rem] gap-2 border-b border-white/8 px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-muted sm:grid-cols-[2.5rem_1fr_repeat(5,2.7rem)] sm:px-5">
        <span>#</span>
        <span>Time</span>

        <span className="text-center">
          J
        </span>

        <span className="hidden text-center sm:block">
          V
        </span>

        <span className="hidden text-center sm:block">
          E
        </span>

        <span className="hidden text-center sm:block">
          SG
        </span>

        <span className="text-center">
          Pts
        </span>
      </div>

      {rows.map((row) => {
        const followed =
          row.team.id ===
          followedTeamId;

        const competitionKey =
          competitionKeyByTeamId?.[
            row.team.id
          ];

        const keyMeta =
          competitionKey
            ? KEY_META[
                competitionKey
              ]
            : null;

        const topThree =
          row.position != null &&
          row.position <= 3;

        const goalDifference =
          row.goalDifference;

        return (
          <div
            key={[
              row.phase ?? "",
              row.group ?? "",
              row.team.id,
            ].join("-")}
            className={`grid grid-cols-[2rem_1fr_2.1rem_2.1rem_2.4rem] items-center gap-2 border-b border-white/6 px-3 py-3 last:border-0 sm:grid-cols-[2.5rem_1fr_repeat(5,2.7rem)] sm:px-5 ${
              followed
                ? "bg-cyan/8"
                : ""
            } ${
              keyMeta?.rowClass ??
              ""
            }`}
          >
            <span
              className={`text-sm font-black ${
                keyMeta
                  ? keyMeta.positionClass
                  : topThree
                    ? "text-cyan"
                    : "text-muted"
              }`}
            >
              {valueOrDash(
                row.position,
              )}
            </span>

            <span className="flex min-w-0 items-center gap-2.5">
              <TeamMark
                team={row.team}
                size="sm"
              />

              <span className="min-w-0 flex-1 truncate text-sm font-bold text-ivory">
                {row.team.name}
              </span>

              {keyMeta ? (
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] ${keyMeta.badgeClass}`}
                >
                  {keyMeta.label}
                </span>
              ) : null}
            </span>

            <span className="text-center text-sm text-muted">
              {valueOrDash(
                row.played,
              )}
            </span>

            <span className="hidden text-center text-sm text-muted sm:block">
              {valueOrDash(
                row.wins,
              )}
            </span>

            <span className="hidden text-center text-sm text-muted sm:block">
              {valueOrDash(
                row.draws,
              )}
            </span>

            <span className="hidden text-center text-sm text-muted sm:block">
              {goalDifference ==
              null
                ? "—"
                : `${
                    goalDifference >
                    0
                      ? "+"
                      : ""
                  }${goalDifference}`}
            </span>

            <span className="text-center text-sm font-black text-ivory">
              {valueOrDash(
                row.points,
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function valueOrDash(
  value:
    | number
    | null
    | undefined,
) {
  return value ?? "—";
}