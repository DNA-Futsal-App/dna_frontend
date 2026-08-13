import type { Standing } from "@/lib/types";
import { TeamMark } from "@/components/team-mark";

export function StandingsTable({ standings, followedTeamId, limit }: { standings: Standing[]; followedTeamId?: string | null; limit?: number }) {
  const rows = typeof limit === "number" ? standings.slice(0, limit) : standings;
  return (
    <div className="surface overflow-hidden rounded-2xl">
      <div className="grid grid-cols-[2rem_1fr_2.1rem_2.1rem_2.4rem] gap-2 border-b border-white/8 px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-muted sm:grid-cols-[2.5rem_1fr_repeat(5,2.7rem)] sm:px-5">
        <span>#</span><span>Time</span><span className="text-center">J</span><span className="hidden text-center sm:block">V</span><span className="hidden text-center sm:block">E</span><span className="hidden text-center sm:block">SG</span><span className="text-center">Pts</span>
      </div>
      {rows.map((row) => {
        const followed = row.team.id === followedTeamId;
        return (
          <div key={row.team.id} className={`grid grid-cols-[2rem_1fr_2.1rem_2.1rem_2.4rem] items-center gap-2 border-b border-white/6 px-3 py-3 last:border-0 sm:grid-cols-[2.5rem_1fr_repeat(5,2.7rem)] sm:px-5 ${followed ? "bg-cyan/8" : ""}`}>
            <span className={`text-sm font-black ${row.position <= 3 ? "text-cyan" : "text-muted"}`}>{row.position}</span>
            <span className="flex min-w-0 items-center gap-2.5"><TeamMark team={row.team} size="sm" /><span className="truncate text-sm font-bold text-ivory">{row.team.name}</span></span>
            <span className="text-center text-sm text-muted">{row.played}</span>
            <span className="hidden text-center text-sm text-muted sm:block">{row.wins}</span>
            <span className="hidden text-center text-sm text-muted sm:block">{row.draws}</span>
            <span className="hidden text-center text-sm text-muted sm:block">{row.goalDifference > 0 ? "+" : ""}{row.goalDifference}</span>
            <span className="text-center text-sm font-black text-ivory">{row.points}</span>
          </div>
        );
      })}
    </div>
  );
}
