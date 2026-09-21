export type AdminAwardEdition = {
  id: string;
  slug: string;
  name: string;
  season: number;
  status: "DRAFT" | "OPEN" | "CLOSED";
  votingOpensAt?: string | null;
  votingClosesAt?: string | null;
};

export type AdminAwardOverview = {
  editionId: string;
  editionName: string;
  season: number;
  status: "DRAFT" | "OPEN" | "CLOSED";
  votingOpensAt?: string | null;
  votingClosesAt?: string | null;
  activeCandidates: number;
  athletes: number;
  coaches: number;
  teams: number;
  positionsPending: number;
  coachesNotInvited: number;
  coachesInvited: number;
  coachesReserved: number;
  coachesRegistered: number;
  coachesVoted: number;
  votersRegistered: number;
  ballotsSubmitted: number;
  ballotsPending: number;
};

export type AdminAwardCandidate = {
  id: string;
  type: "ATHLETE" | "COACH";
  source: "MANUAL" | "SCRAPER";
  externalPersonId?: string | null;
  name: string;
  secondaryName?: string | null;
  positionCode?: "GOLEIRO" | "FIXO" | "ALA" | "PIVO" | null;
  sourceRole?: string | null;
  eventId: number;
  divisionId: number;
  categoryId: number;
  teamId: string;
  teamName: string;
  teamLogoUrl?: string | null;
  imageUrl?: string | null;
  active: boolean;
  importedAt?: string | null;
};

export type CoachAdminAccessState =
  | "NOT_INVITED"
  | "INVITED"
  | "RESERVED"
  | "RESERVATION_EXPIRED"
  | "REGISTERED"
  | "VOTED"
  | "EXPIRED"
  | "REVOKED"
  | "CLAIMED"
  | "INACTIVE";

export type AdminAwardCoach = {
  candidateId: string;
  coachName: string;
  teamId: string;
  teamName: string;
  teamLogoUrl?: string | null;
  eventId: number;
  divisionId: number;
  categoryId: number;
  active: boolean;
  accessState: CoachAdminAccessState;
  inviteId?: string | null;
  inviteExpiresAt?: string | null;
  reservedAt?: string | null;
  reservationExpiresAt?: string | null;
  claimedAt?: string | null;
  userId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  voterCreatedAt?: string | null;
  ballotSubmittedAt?: string | null;
};

export type CreateCoachInviteResult = {
  inviteId: string;
  inviteUrl: string;
  expiresAt: string;
};

export type ImportAwardTeamResult = {
  editionId: string;
  eventId: number;
  divisionId: number;
  categoryId: number;
  teamId: string;
  teamName: string;
  athletesFound: number;
  coachesFound: number;
  created: number;
  updated: number;
  deactivated: number;
  positionsPending: number;
  candidates: AdminAwardCandidate[];
};

export type SyncAwardCoachesResult = {
  editionId: string;
  eventId: number;
  divisionId: number;
  categoryId: number;
  teamsScanned: number;
  coachesFound: number;
  coaches: AdminAwardCandidate[];
};


export type AdminAwardAuditIssue = {
  ballotId?: string | null;
  code: string;
  detail: string;
};

export type AdminAwardAudit = {
  editionId: string;
  editionName: string;
  status: "DRAFT" | "OPEN" | "CLOSED";
  ballotsSubmitted: number;
  voteRows: number;
  requiredCategories: number;
  completeBallots: number;
  invalidBallots: number;
  integrityOk: boolean;
  issues: AdminAwardAuditIssue[];
};

export type AdminAwardCandidateResult = {
  rank: number;
  candidateId: string;
  candidateName: string;
  teamId: string;
  teamName: string;
  teamLogoUrl?: string | null;
  votes: number;
  percentage: number;
};

export type AdminAwardCategoryResult = {
  voteCategoryId: string;
  code: string;
  label: string;
  targetType: "ATHLETE" | "COACH";
  positionCode?: string | null;
  totalVotes: number;
  candidates: AdminAwardCandidateResult[];
};

export type AdminAwardContextResult = {
  eventId: number;
  divisionId: number;
  categoryId: number;
  ballotsSubmitted: number;
  categories: AdminAwardCategoryResult[];
};

export type AdminAwardResults = {
  editionId: string;
  editionName: string;
  season: number;
  status: "CLOSED";
  votingClosedAt?: string | null;
  ballotsSubmitted: number;
  voteRows: number;
  integrityOk: boolean;
  contexts: AdminAwardContextResult[];
};
