export type CompetitionStage = "PAULISTA" | "UNIAO";

export type CompetitionStructure = {
  eventId: number;
  title: string;
  stages: {
    id: CompetitionStage;
    label: string;
    phases: {
      name: string;
      groups: string[];
      brackets: string[];
      knockout: boolean;
      hasStandings: boolean;
      hasScorers: boolean;
    }[];
  }[];
};

export const normalized = (text: string | null | undefined) =>
  (text ?? "").normalize("NFD").replace(/\p{M}/gu, "")
    .toLocaleLowerCase("pt-BR").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/** Never infer a bracket from the participating clubs. */
export function officialMatchBracket(phase: string | null | undefined): string | null {
  const value = normalized(phase);
  const named = value.match(/\bchave\s+([\p{L}\p{N}][\p{L}\p{N} ]*)/u);
  if (named) return `Chave ${named[1]}`;
  const round = value.match(/\b(?:oitavas?|quartas?)(?: de)?(?: final)?\s+([\p{L}\p{N}][\p{L}\p{N} ]*)$/u);
  return round ? `Chave ${round[1]}` : null;
}
