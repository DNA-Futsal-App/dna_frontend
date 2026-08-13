"use client";

import { EmptyState, ErrorState, LoadingCards } from "@/components/feedback";
import { PageIntro } from "@/components/page-intro";
import { StandingsTable } from "@/components/standings-table";
import type { Standing } from "@/lib/types";
import { useApiData } from "@/lib/use-api-data";
import { useProfile } from "@/components/profile-context";

export default function StandingsPage() {
  const { data, loading, error, reload } = useApiData<Standing[]>("/api/standings");
  const { profile } = useProfile();
  return <div><PageIntro eyebrow="Metropolitano A1" title="Classificação" description="A tabela completa da categoria e divisão escolhidas no seu perfil." />{loading ? <LoadingCards count={5} /> : error ? <ErrorState message={error} onRetry={reload} /> : !data?.length ? <EmptyState title="Tabela ainda indisponível" description="A classificação aparecerá assim que a competição publicar os primeiros resultados." /> : <><StandingsTable standings={data} followedTeamId={profile?.teamId} /><div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted"><span><strong className="text-ivory">J</strong> Jogos</span><span><strong className="text-ivory">V</strong> Vitórias</span><span><strong className="text-ivory">E</strong> Empates</span><span><strong className="text-ivory">SG</strong> Saldo de gols</span><span><strong className="text-ivory">Pts</strong> Pontos</span></div></>}</div>;
}
