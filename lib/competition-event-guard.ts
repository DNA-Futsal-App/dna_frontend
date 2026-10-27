import type { CatalogCategory, CatalogItem } from "@/lib/types";
import type { BrowsedCompetition } from "@/components/competition-search";
import type { SportsCompetitionCode } from "@/lib/sports-preference";

type Requests = {
  divisions: (code: SportsCompetitionCode) => Promise<CatalogItem[]>;
  categories: (code: SportsCompetitionCode, divisionId: string) => Promise<CatalogCategory[]>;
};

/** Impede que um ID do catálogo masculino seja tratado como feminino. */
export async function assertCatalogEventIsolation(
  code: SportsCompetitionCode,
  divisionId: string,
  candidateEventId: number,
  requests: Requests,
): Promise<void> {
  if (!Number.isSafeInteger(candidateEventId) || candidateEventId <= 0) {
    throw new Error("O catálogo retornou um eventId inválido.");
  }
  if (code !== "PAULISTA_FEMININO") return;
  const maleDivisions = await requests.divisions("PAULISTA");
  if (!maleDivisions.some((item) => String(item.id) === divisionId)) return;
  const maleCategories = await requests.categories("PAULISTA", divisionId);
  if (maleCategories.some((item) => item.eventId === candidateEventId)) {
    throw new Error("O catálogo feminino retornou um evento masculino. Verifique o encaminhamento de title no frontend/backend/scraper.");
  }
}

/** Seleção inicial a partir do catálogo específico do campeonato. */
export async function firstVerifiedCompetition(
  code: SportsCompetitionCode,
  requests: Requests,
): Promise<BrowsedCompetition> {
  const divisions = await requests.divisions(code);
  if (!divisions.length) {
    throw new Error("O catálogo não retornou divisões para este campeonato.");
  }
  for (const division of divisions) {
    const categories = await requests.categories(code, String(division.id));
    const candidates = [...categories].sort((a, b) =>
      Number(b.name.toLowerCase().includes("principal")) -
      Number(a.name.toLowerCase().includes("principal")),
    );
    for (const category of candidates) {
      if (!Number.isSafeInteger(category.eventId) || category.eventId <= 0) continue;
      await assertCatalogEventIsolation(code, String(division.id), category.eventId, requests);
      return {
        competitionCode: code,
        eventId: category.eventId,
        divisionId: String(division.id),
        divisionName: division.name,
        categoryId: String(category.id),
        categoryName: category.name,
      };
    }
  }
  throw new Error("O catálogo não retornou uma categoria válida para este campeonato.");
}
