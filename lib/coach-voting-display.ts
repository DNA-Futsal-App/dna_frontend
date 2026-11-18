import type { CoachVotingCategory } from "@/lib/awards-types";

const CHOICE_LAYOUT: Record<string, { order: number; label: string }> = {
  GOLEIRO: { order: 10, label: "Melhor Goleiro:" },
  FIXO: { order: 20, label: "Melhor Jogador 1" },
  ALA: { order: 30, label: "Melhor Jogador 2" },
  JOGADOR_5: { order: 40, label: "Melhor Jogador 3" },
  ALA_DIREITA: { order: 40, label: "Melhor Jogador 3" },
  PIVO: { order: 50, label: "Melhor Jogador 4" },
  TECNICO: { order: 60, label: "Melhor Treinador" },
};

function votingOrder(code: string, displayOrder: number): number {
  return CHOICE_LAYOUT[code.toUpperCase()]?.order ?? 1000 + displayOrder;
}

/** Ordenação somente visual, sem alterar categorias, votos ou a apuração no servidor. */
export function orderedVoteCategories(categories: readonly CoachVotingCategory[]): CoachVotingCategory[] {
  return [...categories].sort((a, b) =>
    votingOrder(a.code, a.displayOrder) - votingOrder(b.code, b.displayOrder)
    || a.displayOrder - b.displayOrder
    || a.id.localeCompare(b.id),
  );
}

/** Utilizado para exibir o comprovante na mesma ordem do formulário. */
export function orderedCoachBallotVotes<T extends { voteCategoryCode: string }>(votes: readonly T[]): T[] {
  return [...votes].sort((a, b) =>
    votingOrder(a.voteCategoryCode, 0) - votingOrder(b.voteCategoryCode, 0),
  );
}

/** Os rótulos são vinculados aos códigos estáveis, não ao índice de cada atleta. */
export function playerSlotLabels(categories: readonly CoachVotingCategory[]): Record<string, string> {
  return Object.fromEntries(
    categories.map((category) => [
      category.id,
      CHOICE_LAYOUT[category.code.toUpperCase()]?.label ?? category.label,
    ]),
  );
}

export function voteCategoryLabel(
  category: CoachVotingCategory,
  slots: Record<string, string>,
): string {
  return slots[category.id] ?? category.label;
}
