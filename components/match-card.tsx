import { CalendarDays, MapPin } from "lucide-react";
import { formatDate } from "@/lib/client-api";
import type { Match } from "@/lib/types";
import { TeamMark } from "@/components/team-mark";

export function MatchCard({ match, compact = false }: { match: Match; compact?: boolean }) {
  const finished = match.status === "FINISHED" || match.homeScore != null;
  const date = new Date(match.scheduledAt);
  const day = formatDate(match.scheduledAt, { day: "2-digit", month: "short" }).replace(".", "");
  const time = date.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });

  return (
    <article className={`surface rounded-2xl ${compact ? "p-4" : "p-4 sm:p-5"}`}>
      <div className="flex items-center justify-between gap-3 text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted">
        <span className="truncate">{match.round ?? match.competitionName ?? "Partida"}</span>
        <span className={finished ? "text-amber" : "text-cyan"}>{finished ? "Encerrado" : `${day} • ${time}`}</span>
      </div>
      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
        <TeamSide team={match.homeTeam} align="right" />
        <div className="flex min-w-14 items-center justify-center rounded-xl border border-white/10 bg-ink/50 px-2 py-2 font-mono text-lg font-black text-ivory">
          {finished ? `${match.homeScore ?? 0} × ${match.awayScore ?? 0}` : "×"}
        </div>
        <TeamSide team={match.awayTeam} align="left" />
      </div>
      {!compact ? (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-white/7 pt-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5" aria-hidden="true" />{day}, {time}</span>
          {match.venue ? <span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" aria-hidden="true" />{match.venue}</span> : null}
        </div>
      ) : null}
    </article>
  );
}

function TeamSide({ team, align }: { team: Match["homeTeam"]; align: "left" | "right" }) {
  return (
    <div className={`flex min-w-0 items-center gap-2 ${align === "right" ? "flex-row-reverse text-right" : "text-left"}`}>
      <TeamMark team={team} />
      <span className="min-w-0 truncate text-sm font-extrabold text-ivory sm:text-base">{team.shortName || team.name}</span>
    </div>
  );
}
