export type CatalogItem = {
  id: number;
  name: string;
  logoUrl?: string | null;
};

export type Team = {
  id: string;
  name: string;
  shortName?: string | null;
  logoUrl?: string | null;
};

export type Match = {
  id: string;
  eventId: number;

  competitionName?: string | null;
  season: number;

  category?: string | null;
  division?: string | null;
  phase?: string | null;

  homeTeam: Team;
  awayTeam: Team;

  homeScore?: number | null;
  awayScore?: number | null;

  scheduledAt?: string | null;

  status: string;
  walkover: boolean;

  venue?: string | null;
  matchSheetUrl?: string | null;
};

export type Standing = {
  phase?: string | null;
  group?: string | null;

  position?: number | null;

  team: Team;

  played?: number | null;
  wins?: number | null;
  draws?: number | null;
  losses?: number | null;

  goalsFor?: number | null;
  goalsAgainst?: number | null;
  goalDifference?: number | null;

  points?: number | null;

  average?: number | null;
  goalsForAverage?: number | null;
  goalsAgainstAverage?: number | null;
  technicalIndex?: number | null;
};

export type TopScorer = {
  position: number;

  phase?: string | null;

  athleteName?: string | null;
  athleteImageUrl?: string | null;

  team: Team;

  goals?: number | null;

  personalDataSuppressed: boolean;
};

export type NewsArticle = {
  id: string;
  slug: string;
  title: string;
  summary?: string | null;
  content?: string | null;
  coverImageUrl?: string | null;
  authorName?: string | null;
  publishedAt: string;
};

export type NewsPage = {
  content: NewsArticle[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  phone: string;

  childInstagram?: string | null;

  eventId?: number | null;
  categoryId?: string | null;
  divisionId?: string | null;
  teamId?: string | null;

  emailVerified: boolean;
  createdAt: string;
};

export type AuthResponse = {
  tokenType: "Bearer";
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  user: UserProfile;
};

export type ApiProblem = {
  title?: string;
  status?: number;
  detail?: string;
  code?: string;
  fields?: Record<string, string>;
};

export type DashboardData = {
  played: Match[];
  upcoming: Match[];
  standings: Standing[];
  topScorers: TopScorer[];
  news: NewsPage;
};

export type CatalogCategory = {
  id: number;
  name: string;
  eventId: number;
};

export type MatchCalendar = {
  currentPhase?: string | null;
  played: Match[];
  upcoming: Match[];
};

export type TeamFormResult =
  | "WIN"
  | "DRAW"
  | "LOSS"
  | "UNKNOWN";

export type MyTeam = {
  configured: boolean;

  team?: Team | null;

  eventId: number;

  competitionName?: string | null;
  season: number;
  category?: string | null;
  division?: string | null;
  currentPhase?: string | null;

  standing?: Standing | null;

  latestMatch?: Match | null;
  nextMatch?: Match | null;

  recentMatches: Match[];
  upcomingMatches: Match[];

  topScorers: TopScorer[];

  recentForm: TeamFormResult[];
}; 