export type AdminAwardEdition = {
  id: string;
  slug: string;
  name: string;
  season: number;
  status: "DRAFT" | "OPEN" | "CLOSED";
  votingOpensAt?: string | null;
  votingClosesAt?: string | null;
  registrationsOpen: boolean;
  registrationsOpenedAt?: string | null;
  registrationsClosedAt?: string | null;
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

export type ResetAwardVotingResult = {
  editionId: string;
  ballotsDeleted: number;
  votesDeleted: number;
  edition: AdminAwardEdition;
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

export type AdminAwardRegistrationReviewStatus =
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED";

export type AdminAwardRegistrationEntry = {
  id: string;
  contestCategory: string;
  contestCategoryLabel: string;
  sourceType: "LINK" | "UPLOAD";
  mediaStatus: "PENDING" | "PROCESSING" | "READY" | "FAILED";
  reviewStatus: AdminAwardRegistrationReviewStatus;
  externalUrl?: string | null;
  displayFilename?: string | null;
  durationMs?: number | null;
  width?: number | null;
  height?: number | null;
  fileSizeBytes?: number | null;
  reviewedAt?: string | null;
  reviewedByUserId?: string | null;
  reviewedByName?: string | null;
  reviewReason?: string | null;
};

export type AdminAwardRegistration = {
  id: string;
  registrationNumber: number;
  status: "SUBMITTED";
  representativeUserId: string;
  representativeName: string;
  representativeEmail: string;
  athleteName: string;
  athleteInstagram: string;
  gender: "MALE" | "FEMALE";
  divisionId: number;
  divisionName: string;
  categoryId: number;
  categoryName: string;
  eventId: number;
  teamId: string;
  teamName: string;
  submittedAt?: string | null;
  entries: AdminAwardRegistrationEntry[];
};

export type AdminAwardRegistrationPage = {
  items: AdminAwardRegistration[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  pendingReview: number;
  approved: number;
  rejected: number;
};

export type AdminAwardMediaTicket = {
  url: string;
  expiresAt: string;
};
