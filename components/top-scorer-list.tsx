import { Trophy } from "lucide-react";

import { TeamMark } from "@/components/team-mark";
import type { TopScorer } from "@/lib/types";

export function TopScorerList({
  scorers,
  limit,
}: {
  scorers: TopScorer[];
  limit?: number;
}) {
  const rows =
    typeof limit === "number"
      ? scorers.slice(0, limit)
      : scorers;

  return (
    <div className="surface overflow-hidden rounded-2xl">
      {rows.map((scorer) => {
        const athleteName =
          scorer.personalDataSuppressed
            ? "Atleta não exibido"
            : scorer.athleteName ??
              "Atleta";

        return (
          <div
            key={`${scorer.position}-${scorer.team.id}-${athleteName}`}
            className="grid grid-cols-[2rem_2.5rem_1fr_auto] items-center gap-2 border-b border-white/6 px-4 py-3.5 last:border-0"
          >
            <span
              className={`text-center text-sm font-black ${
                scorer.position <=
                3
                  ? "text-amber"
                  : "text-muted"
              }`}
            >
              {scorer.position}
            </span>

            <TeamMark
              team={scorer.team}
              size="sm"
            />

            <span className="min-w-0">
              <strong className="block truncate text-sm text-ivory">
                {athleteName}
              </strong>

              <small className="block truncate text-xs text-muted">
                {scorer.team.name}

                {scorer.phase
                  ? ` • ${scorer.phase}`
                  : ""}
              </small>
            </span>

            <span className="inline-flex items-center gap-1 rounded-full bg-amber/10 px-2.5 py-1 text-sm font-black text-amber">
              <Trophy
                className="size-3.5"
                aria-hidden="true"
              />

              {scorer.goals ?? 0}
            </span>
          </div>
        );
      })}
    </div>
  );
}