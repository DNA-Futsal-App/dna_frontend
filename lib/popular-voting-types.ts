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
  status: VotingStatus;
  opensAt: string | null;
  closesAt: string | null;
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
export type MissingVideo = { entryId: string; athleteName: string; registrationNumber: number };
export type MissingAdmin = { adminId: string; adminName: string; adminEmail: string | null; missingVideos: MissingVideo[] };
export type VotingReadiness = {
  context: Pick<VotingContext, "eventId" | "divisionId" | "categoryId" | "gender" | "contestCategory">;
  approvedVideos: number;
  pendingReview: number;
  activeAdministrators: number;
  finalistsConfirmed: boolean;
  registrationsOpen: boolean;
  ready: boolean;
  blockers: string[];
  missingAdmins: MissingAdmin[];
};
export type ContextWindow = {
  context: VotingReadiness["context"];
  status: VotingStatus;
  opensAt: string | null;
  closesAt: string | null;
  manuallyClosedAt: string | null;
};

export function votingContextKey(context: VotingContext): string {
  return [context.eventId, context.divisionId, context.categoryId, context.gender, context.contestCategory].join("|");
}
export function votingParams(context: VotingReadiness["context"]): string {
  return new URLSearchParams({
    eventId: String(context.eventId), divisionId: String(context.divisionId),
    categoryId: String(context.categoryId), gender: context.gender,
    contestCategory: context.contestCategory,
  }).toString();
}
export function votingCategoryUrl(editionId: string, context: VotingReadiness["context"]): string {
  const parts = [editionId, context.eventId, context.divisionId, context.categoryId, context.gender];
  return `/premio/votacao/${parts.map((part) => encodeURIComponent(String(part))).join("/")}`;
}

export function votingContextUrl(editionId: string, context: VotingReadiness["context"]): string {
  const parts = [editionId, context.eventId, context.divisionId,
    context.categoryId, context.gender, context.contestCategory];
  return `/premio/votacao/${parts.map((part) => encodeURIComponent(String(part))).join("/")}`;
}
export function votingStatusLabel(status: VotingStatus): string {
  return ({ NOT_SCHEDULED: "Não programada", SCHEDULED: "Em breve",
    OPEN: "Votação aberta", CLOSED: "Encerrada" })[status];
}
export function votingDate(value: string | null): string {
  return value ? new Date(value).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo",
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
}

// A BFF já diferencia GET público de ações autenticadas e protege os POST por origem.
export async function popularVotingRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/popular-voting/${path}`, {
    ...init, credentials: "same-origin", cache: "no-store",
    headers: { Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}) },
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = (body as { detail?: string } | null)?.detail;
    throw Object.assign(new Error(detail ?? "Não foi possível concluir a solicitação."), { status: response.status });
  }
  return body as T;
}
