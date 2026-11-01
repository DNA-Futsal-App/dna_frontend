/** A competition is the followed sporting event, not the account holder's gender. */
export type SportsCompetitionCode = "PAULISTA" | "PAULISTA_FEMININO";
export type CompetitionSelection = SportsCompetitionCode | "LEGACY";

export const SPORTS_COMPETITIONS: ReadonlyArray<{
  code: SportsCompetitionCode;
  label: string;
}> = [
  { code: "PAULISTA", label: "Campeonato Paulista Masculino" },
  { code: "PAULISTA_FEMININO", label: "Campeonato Paulista Feminino" },
];

export type SportsPreference = {
  competitionCode: SportsCompetitionCode | null;
  eventId: number | null;
  divisionId: string | null;
  categoryId: string | null;
  teamId: string | null;
};

export function divisionsCatalogUrl(code: CompetitionSelection): string {
  return `/api/catalog/divisions${titleSuffix(code, false)}`;
}

export function categoriesCatalogUrl(
  code: CompetitionSelection,
  divisionId: string,
): string {
  const url = `/api/catalog/categories?divisionId=${encodeURIComponent(divisionId)}`;
  return url + titleSuffix(code, true);
}

function titleSuffix(code: CompetitionSelection, hasQuery: boolean): string {
  // Preserve the pre-existing masculine/legacy endpoint for older accounts.
  return code === "PAULISTA_FEMININO"
    ? `${hasQuery ? "&" : "?"}title=Paulista%20Feminino`
    : "";
}

/** Preserve existing preferences if a user only edits personal profile data. */
export function savedSportsPreference(previous: Partial<SportsPreference>): SportsPreference {
  return {
    competitionCode: previous.competitionCode ?? null,
    eventId: previous.eventId ?? null,
    divisionId: previous.divisionId ?? null,
    categoryId: previous.categoryId ?? null,
    teamId: previous.teamId ?? null,
  };
}

export function buildSportsPreference(
  code: CompetitionSelection,
  eventId: number | null,
  divisionId: string,
  categoryId: string,
  teamId: string,
): SportsPreference {
  if (code === "LEGACY") {
    throw new Error("Selecione o campeonato antes de alterar sua preferência esportiva.");
  }
  // Choosing a competition without choosing a category is not a follow yet.
  if (!divisionId && !categoryId && eventId == null && !teamId) {
    // Preserve an explicitly selected female championship, even before selecting a category.
    // Otherwise the backend would fall back to the masculine default after registration.
    return { competitionCode: code === "PAULISTA_FEMININO" ? code : null,
      eventId: null, divisionId: null, categoryId: null, teamId: null };
  }
  if (!divisionId || !categoryId || eventId == null) {
    throw new Error("Escolha divisão e categoria, ou deixe toda a preferência esportiva vazia.");
  }
  return {
    competitionCode: code,
    eventId,
    divisionId,
    categoryId,
    teamId: teamId || null,
  };
}
