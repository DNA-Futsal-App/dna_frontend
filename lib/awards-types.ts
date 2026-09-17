export type CoachInviteInfo = {
  inviteId: string;
  available: boolean;
  status:
    | "AVAILABLE"
    | "CLAIMED"
    | "REVOKED"
    | "EXPIRED"
    | "EDITION_CLOSED"
    | "CANDIDATE_INACTIVE"
    | "RESERVED"
    | "RESERVATION_EXPIRED";
  expiresAt: string;
  editionId: string;
  editionSlug: string;
  editionName: string;
  season: number;
  coachName: string;
  eventId: number;
  divisionId: number;
  categoryId: number;
  teamId: string;
  teamName: string;
};

export type CoachVotingState =
  | "DRAFT"
  | "SCHEDULED"
  | "OPEN"
  | "CLOSED"
  | "SUBMITTED";

export type CoachVotingCategory = {
  id: string;
  code: string;
  label: string;
  targetType: "ATHLETE" | "COACH";
  positionCode?: string | null;
  displayOrder: number;
  required: boolean;
};

export type CoachVotingTeam = {
  id: string;
  name: string;
  logoUrl?: string | null;
};

export type CoachVotingCandidate = {
  id: string;
  name: string;
  secondaryName?: string | null;
  imageUrl?: string | null;
  type: "ATHLETE" | "COACH";
  positionCode?: string | null;
  teamId: string;
  teamName: string;
  teamLogoUrl?: string | null;
};

export type CoachVotingContext = {
  editionId: string;
  editionSlug: string;
  editionName: string;
  season: number;
  state: CoachVotingState;
  votingOpensAt?: string | null;
  votingClosesAt?: string | null;
  voterId: string;
  coachName: string;
  eventId: number;
  divisionId: number;
  categoryId: number;
  representedTeamId: string;
  representedTeamName: string;
  submitted: boolean;
  voteCategories: CoachVotingCategory[];
  teams: CoachVotingTeam[];
};

export type CoachBallotChoice = {
  voteCategoryId: string;
  voteCategoryCode: string;
  voteCategoryLabel: string;
  candidateId: string;
  candidateName: string;
  teamId: string;
  teamName: string;
};

export type CoachBallot = {
  ballotId: string;
  editionId: string;
  submittedAt: string;
  votes: CoachBallotChoice[];
};
