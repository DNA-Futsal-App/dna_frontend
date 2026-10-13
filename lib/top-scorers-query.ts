import type { TopScorer } from "@/lib/types";

export type ScorerScope = "general" | "knockout";

export function topScorersUrl(eventId: number | null, scope: ScorerScope, limit: number) {
  // An omitted phase selects the current phase in SportsQueryService, not Geral.
  // The API uses substring matching: "mata" covers "Mata-mata" and "Mata Mata".
  const params = new URLSearchParams({
    limit: String(limit),
    phase: scope === "general" ? "Geral" : "mata",
  });
  if (eventId != null) params.set("eventId", String(eventId));
  return `/api/top-scorers?${params}`;
}

export function hasKnockoutScorers(scorers: TopScorer[] | null) {
  // Confirm the returned phase as well, so an API ignoring the filter does not
  // offer the general ranking under a knockout label.
  return scorers?.some((scorer) => /mata[\s\p{Pd}]*mata/iu.test(scorer.phase ?? "")) ?? false;
}
