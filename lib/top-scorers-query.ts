import type { TopScorer } from "@/lib/types";

export type ScorerScope =
  | "general"
  | "knockout";

export function topScorersUrl(
  eventId: number | null,
  scope: ScorerScope,
  limit: number,
) {
  const params = new URLSearchParams({
    limit: String(limit),
    scope:
      scope === "general"
        ? "GENERAL"
        : "KNOCKOUT",
  });

  if (eventId != null) {
    params.set(
      "eventId",
      String(eventId),
    );
  }

  return `/api/top-scorers?${params}`;
}

export function hasKnockoutScorers(
  scorers: TopScorer[] | null,
) {
  // O backend garante o recorte KNOCKOUT; não dependemos do texto da fase.
  return Boolean(scorers?.length);
}
