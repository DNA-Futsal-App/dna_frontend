import type { CoachVotingCategory } from "@/lib/awards-types";

/** Labels are presentation-only: voting category IDs/codes stay unchanged. */
export function playerSlotLabels(categories: CoachVotingCategory[]): Record<string, string> {
  const athletes = categories
    .filter((category) => category.targetType === "ATHLETE")
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder || a.id.localeCompare(b.id));

  return Object.fromEntries(
    athletes.map((category, index) => [category.id, `Jogador ${index + 1}`]),
  );
}

export function voteCategoryLabel(
  category: CoachVotingCategory,
  slots: Record<string, string>,
): string {
  return category.targetType === "ATHLETE"
    ? (slots[category.id] ?? category.label)
    : category.label;
}
