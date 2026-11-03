export type Gender = "MALE" | "FEMALE";
export type ContestCategory = "BEAUTIFUL_GOAL" | "BEST_DRIBBLE" | "FREE_KICK_GOAL" | "BEST_SAVE";
export type VotingStatus = "NOT_SCHEDULED" | "SCHEDULED" | "OPEN" | "CLOSED";

export type VotingEdition = {
  editionId: string;
  editionName: string;
  season: number;
  status: VotingStatus;
  opensAt: string | null;
  closesAt: string | null;
  manuallyClosedAt: string | null;
};
export type VotingContext = {
  eventId: number;
  divisionId: number;
  divisionName: string;
  categoryId: number;
  categoryName: string;
  gender: Gender;
  contestCategory: ContestCategory;
  contestCategoryLabel: string;
};
export type VotingFinalist = {
  entryId: string;
  athleteName: string;
  teamName: string;
  sourceType: "UPLOAD" | "LINK";
  externalUrl: string | null;
  votes: number | null;
};
export type VotingBoard = {
  status: VotingStatus;
  finalists: VotingFinalist[];
  totalVotes: number | null;
};
export type MyVote = { entryId: string | null; status: "VOTED" | "NOT_VOTED" };
export type VideoTicket = { url: string; expiresAt: string };

export function votingContextKey(context: VotingContext): string {
  return [context.eventId, context.divisionId, context.categoryId, context.gender, context.contestCategory].join("|");
}
export function votingParams(context: VotingContext): string {
  return new URLSearchParams({
    eventId: String(context.eventId), divisionId: String(context.divisionId),
    categoryId: String(context.categoryId), gender: context.gender,
    contestCategory: context.contestCategory,
  }).toString();
}
