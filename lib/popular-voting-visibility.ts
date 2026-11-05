import type { VotingContext } from "@/lib/popular-voting-types";

// Uma disputa encerrada nunca deve aparecer nos catálogos públicos.
export function visibleVotingContexts(contexts: VotingContext[]): VotingContext[] {
  return contexts.filter((item) => item.status === "OPEN" || item.status === "SCHEDULED");
}
