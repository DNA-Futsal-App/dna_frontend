import type {
  DashboardData,
  Match,
  NewsArticle,
  NewsPage,
  Standing,
  Team,
  TopScorer,
  UserProfile,
} from "@/lib/types";

export const demoTeams: Team[] = [
  { id: "santos", name: "Santos FC", shortName: "SAN" },
  { id: "magnus", name: "Magnus Futsal", shortName: "MAG" },
  { id: "corinthians", name: "Corinthians", shortName: "COR" },
  { id: "pulo", name: "Pulo Futsal", shortName: "PUL" },
  { id: "juventus", name: "Clube Atlético Juventus", shortName: "JUV" },
  { id: "taboao", name: "Taboão Magnus", shortName: "TAB" },
];

export const demoUser: UserProfile = {
  id: "2568f54b-27f8-4d67-a03c-52d895e21a55",
  name: "Alexandre Silva",
  email: "alexandre@dnafutsal.com.br",
  phone: "+5511987654321",
  childInstagram: "@atleta.dna",
  categoryId: "sub-13",
  divisionId: "especial",
  teamId: "santos",
  emailVerified: true,
  createdAt: "2026-07-17T12:00:00Z",
};

export const demoPlayed: Match[] = [
  {
    id: "played-1",
    competitionName: "Metropolitano A1",
    categoryId: "sub-13",
    categoryName: "Sub-13",
    divisionId: "especial",
    divisionName: "Divisão Especial",
    round: "7ª rodada",
    homeTeam: demoTeams[0],
    awayTeam: demoTeams[2],
    homeScore: 4,
    awayScore: 2,
    scheduledAt: "2026-08-09T14:00:00-03:00",
    status: "FINISHED",
    venue: "Arena Santos",
  },
  {
    id: "played-2",
    competitionName: "Metropolitano A1",
    categoryId: "sub-13",
    categoryName: "Sub-13",
    divisionId: "especial",
    divisionName: "Divisão Especial",
    round: "6ª rodada",
    homeTeam: demoTeams[1],
    awayTeam: demoTeams[0],
    homeScore: 3,
    awayScore: 3,
    scheduledAt: "2026-08-02T11:00:00-03:00",
    status: "FINISHED",
    venue: "Arena Sorocaba",
  },
  {
    id: "played-3",
    competitionName: "Metropolitano A1",
    categoryId: "sub-13",
    categoryName: "Sub-13",
    divisionId: "especial",
    divisionName: "Divisão Especial",
    round: "5ª rodada",
    homeTeam: demoTeams[0],
    awayTeam: demoTeams[3],
    homeScore: 5,
    awayScore: 1,
    scheduledAt: "2026-07-26T15:30:00-03:00",
    status: "FINISHED",
    venue: "Arena Santos",
  },
];

export const demoUpcoming: Match[] = [
  {
    id: "upcoming-1",
    competitionName: "Metropolitano A1",
    categoryId: "sub-13",
    categoryName: "Sub-13",
    divisionId: "especial",
    divisionName: "Divisão Especial",
    round: "8ª rodada",
    homeTeam: demoTeams[4],
    awayTeam: demoTeams[0],
    scheduledAt: "2026-08-16T10:30:00-03:00",
    status: "SCHEDULED",
    venue: "Ginásio Juventus",
  },
  {
    id: "upcoming-2",
    competitionName: "Metropolitano A1",
    categoryId: "sub-13",
    categoryName: "Sub-13",
    divisionId: "especial",
    divisionName: "Divisão Especial",
    round: "9ª rodada",
    homeTeam: demoTeams[0],
    awayTeam: demoTeams[5],
    scheduledAt: "2026-08-23T14:00:00-03:00",
    status: "SCHEDULED",
    venue: "Arena Santos",
  },
];

export const demoStandings: Standing[] = [
  { position: 1, team: demoTeams[0], played: 7, wins: 6, draws: 1, losses: 0, goalsFor: 32, goalsAgainst: 11, goalDifference: 21, points: 19 },
  { position: 2, team: demoTeams[1], played: 7, wins: 5, draws: 2, losses: 0, goalsFor: 29, goalsAgainst: 13, goalDifference: 16, points: 17 },
  { position: 3, team: demoTeams[2], played: 7, wins: 4, draws: 1, losses: 2, goalsFor: 24, goalsAgainst: 17, goalDifference: 7, points: 13 },
  { position: 4, team: demoTeams[4], played: 7, wins: 3, draws: 1, losses: 3, goalsFor: 20, goalsAgainst: 21, goalDifference: -1, points: 10 },
  { position: 5, team: demoTeams[3], played: 7, wins: 2, draws: 1, losses: 4, goalsFor: 16, goalsAgainst: 25, goalDifference: -9, points: 7 },
  { position: 6, team: demoTeams[5], played: 7, wins: 1, draws: 0, losses: 6, goalsFor: 10, goalsAgainst: 34, goalDifference: -24, points: 3 },
];

export const demoTopScorers: TopScorer[] = [
  { position: 1, athleteId: "ath-1", athleteName: "Gabriel Souza", team: demoTeams[0], goals: 12, matches: 7 },
  { position: 2, athleteId: "ath-2", athleteName: "Rafael Lima", team: demoTeams[1], goals: 10, matches: 7 },
  { position: 3, athleteId: "ath-3", athleteName: "Miguel Santos", team: demoTeams[2], goals: 9, matches: 6 },
  { position: 4, athleteId: "ath-4", athleteName: "Lucas Alves", team: demoTeams[0], goals: 8, matches: 7 },
  { position: 5, athleteId: "ath-5", athleteName: "Pedro Rocha", team: demoTeams[4], goals: 7, matches: 7 },
];

export const demoNews: NewsArticle[] = [
  {
    id: "news-1",
    slug: "rodada-sub-13-teve-virada-e-muitos-gols",
    title: "Rodada Sub-13 teve virada, equilíbrio e muitos gols",
    summary: "Os destaques da sétima rodada do Metropolitano, com os resultados que mexeram na liderança.",
    content: "A sétima rodada confirmou o equilíbrio da categoria Sub-13 e entregou grandes jogos. O Santos manteve a liderança com uma atuação segura, enquanto Magnus e Corinthians seguem próximos na disputa.\n\nA próxima rodada começa no domingo, com confrontos diretos que podem mudar as primeiras posições da tabela.",
    authorName: "Redação DNA Futsal",
    publishedAt: "2026-08-10T12:00:00-03:00",
  },
  {
    id: "news-2",
    slug: "cinco-atletas-para-ficar-de-olho-na-proxima-rodada",
    title: "5 atletas para ficar de olho na próxima rodada",
    summary: "Velocidade, leitura de jogo e poder de decisão: conheça quem chega em alta para o fim de semana.",
    content: "A nova geração do futsal paulista chega à oitava rodada com números importantes e evolução visível. Selecionamos cinco atletas que vêm assumindo protagonismo em suas equipes.\n\nAlém dos gols, a lista considera regularidade, participação coletiva e desempenho nos momentos decisivos.",
    authorName: "Equipe DNA",
    publishedAt: "2026-08-08T09:30:00-03:00",
  },
  {
    id: "news-3",
    slug: "agenda-do-fim-de-semana-confira-os-principais-jogos",
    title: "Agenda do fim de semana: confira os principais jogos",
    summary: "Horários, locais e confrontos das categorias de base para você não perder nenhum lance.",
    content: "O fim de semana terá jogos em Santos, São Paulo e Sorocaba. Consulte a aba Jogos para acompanhar horários atualizados, locais e possíveis alterações divulgadas pela organização.",
    authorName: "Redação DNA Futsal",
    publishedAt: "2026-08-07T18:00:00-03:00",
  },
];

export const demoNewsPage: NewsPage = {
  content: demoNews,
  page: 0,
  size: 20,
  totalElements: demoNews.length,
  totalPages: 1,
};

export const demoDashboard: DashboardData = {
  played: demoPlayed,
  upcoming: demoUpcoming,
  standings: demoStandings,
  topScorers: demoTopScorers,
  news: demoNewsPage,
};
