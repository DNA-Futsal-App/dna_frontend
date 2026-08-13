export type CatalogItem = {
  id: string;
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
  competitionName?: string | null;
  categoryId: string;
  categoryName?: string | null;
  divisionId: string;
  divisionName?: string | null;
  round?: string | null;
  homeTeam: Team;
  awayTeam: Team;
  homeScore?: number | null;
  awayScore?: number | null;
  scheduledAt: string;
  status: string;
  venue?: string | null;
};

export type Standing = {
  position: number;
  team: Team;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

export type TopScorer = {
  position: number;
  athleteId?: string | null;
  athleteName: string;
  team: Team;
  goals: number;
  matches: number;
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
