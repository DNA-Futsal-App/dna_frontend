import type {
  AdminAwardCategoryResult,
  AdminAwardContextResult,
} from "@/lib/admin-awards-types";

export type AwardRace = {
  key: string;
  context: AdminAwardContextResult;
  category: AdminAwardCategoryResult;
  leaders: AdminAwardCategoryResult["candidates"];
  lead: number | null;
};

export function awardContextKey(context: AdminAwardContextResult) {
  return `${context.eventId}:${context.divisionId}:${context.categoryId}`;
}

export function buildAwardRaces(contexts: AdminAwardContextResult[]): AwardRace[] {
  return contexts.flatMap((context) => context.categories.flatMap((category) => {
    const candidates = category.candidates
      .filter((candidate) => candidate.votes > 0)
      .sort((a, b) => b.votes - a.votes || a.candidateName.localeCompare(b.candidateName, "pt-BR"));
    if (!candidates.length) return [];

    // Equal vote totals share a position, including ties below first place.
    let rank = 1;
    const ranked = candidates.map((candidate, index) => {
      if (index > 0 && candidates[index - 1].votes !== candidate.votes) rank = index + 1;
      return {
        ...candidate,
        rank,
        percentage: category.totalVotes > 0 ? candidate.votes / category.totalVotes * 100 : 0,
      };
    });
    const leaders = ranked.filter((candidate) => candidate.votes === ranked[0].votes);
    return [{
      key: `${awardContextKey(context)}:${category.voteCategoryId}`,
      context,
      category: { ...category, candidates: ranked },
      leaders,
      lead: ranked.length > 1 ? ranked[0].votes - ranked[1].votes : null,
    }];
  }));
}

export function awardResultsCsv(races: AwardRace[]) {
  const rows = [["divisao_id", "categoria_id", "evento_id", "premio", "posicao", "candidato", "time", "votos", "percentual"]];
  for (const { context, category } of races) {
    for (const candidate of category.candidates) {
      rows.push([
        String(context.divisionId), String(context.categoryId), String(context.eventId),
        category.label, String(candidate.rank), candidate.candidateName, candidate.teamName,
        String(candidate.votes), candidate.percentage.toFixed(2),
      ]);
    }
  }
  return "\ufeff" + rows.map((row) => row.map((value) => {
    // Spreadsheet applications can otherwise interpret candidate/team names as formulas.
    const safe = /^[=+@\-\t\r\n]/.test(value) ? `'${value}` : value;
    return `"${safe.replaceAll('"', '""')}"`;
  }).join(";")).join("\n");
}
