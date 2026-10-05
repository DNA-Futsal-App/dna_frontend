export type AwardContestCategory =
  | "BEAUTIFUL_GOAL"
  | "BEST_DRIBBLE"
  | "FREE_KICK_GOAL"
  | "BEST_SAVE";

export type MediaSourceType = "LINK" | "UPLOAD";
export type MediaStatus = "PENDING" | "PROCESSING" | "READY" | "FAILED";
export type AwardRegistrationReviewStatus =
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED";

export type AwardContestCategoryOption = {
  code: AwardContestCategory;
  label: string;
};

export type AwardGender =
  | "MALE"
  | "FEMALE";

export type AwardRegistrationContext = {
  editionName: string;
  season: number;
  registrationsOpen: boolean;
  maxUploadBytes: number;
  maxDurationSeconds: number;
  contestCategories: AwardContestCategoryOption[];
};

export type AwardRegistrationEntryResponse = {
  id: string;
  contestCategory: AwardContestCategory;
  contestCategoryLabel: string;
  sourceType: MediaSourceType;
  mediaStatus: MediaStatus;
  reviewStatus: AwardRegistrationReviewStatus;
  externalUrl?: string | null;
  displayFilename?: string | null;
  durationMs?: number | null;
  width?: number | null;
  height?: number | null;
  fileSizeBytes?: number | null;
  reviewedAt?: string | null;
  reviewReason?: string | null;
};

export type AwardRegistrationResponse = {
  id: string;
  registrationNumber: number;
  status: "DRAFT" | "SUBMITTED" | "CANCELLED";
  athleteName: string;
  athleteInstagram: string;
  divisionId: number;
  divisionName: string;
  categoryId: number;
  categoryName: string;
  eventId: number;
  teamId: string;
  teamName: string;
  submittedAt?: string | null;
  entries: AwardRegistrationEntryResponse[];
  gender: AwardGender;
};

export type AwardUploadTicketResponse = {
  uploadUrl: string;
  expiresAt: string;
  maxUploadBytes: number;
};

export type AwardMediaTicketResponse = {
  url: string;
  expiresAt: string;
};