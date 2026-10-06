"use client";

import {
  CompetitionSearch,
  useCompetitionBrowse,
} from "@/components/competition-search";
import {
  EmptyState,
  ErrorState,
  LoadingCards,
} from "@/components/feedback";
import { PageIntro } from "@/components/page-intro";
import { useProfile } from "@/components/profile-context";
import { StandingsTable } from "@/components/standings-table";
import type { Standing } from "@/lib/types";
import { useApiData } from "@/lib/use-api-data";

export default function StandingsPage() {
  const { profile } = useProfile();
  const {
    activeEventId,
    isExploring,
  } = useCompetitionBrowse();

  const dataUrl =
    activeEventId != null
      ? `/api/standings?eventId=${encodeURIComponent(
          String(activeEventId),
        )}`
      : "/api/standings";

  const {
    data,
    loading,
    error,
    reload,
  } = useApiData<Standing[]>(
    dataUrl,
  );

  return (
    <div>
      <PageIntro
        eyebrow="Campeonato Paulista"
        title="Classificação"
        description="Consulte a tabela de qualquer divisão e categoria sem alterar suas preferências."
      />

      <CompetitionSearch />

      {loading ? (
        <LoadingCards count={5} />
      ) : error ? (
        <ErrorState
          message={error}
          onRetry={reload}
        />
      ) : !data?.length ? (
        <EmptyState
          title="Tabela ainda indisponível"
          description="A classificação aparecerá assim que a competição publicar os primeiros resultados."
        />
      ) : (
        <>
          <StandingsTable
            standings={data}
            followedTeamId={
              isExploring
                ? undefined
                : profile?.teamId
            }
          />

          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
            <span>
              <strong className="text-ivory">
                J
              </strong>{" "}
              Jogos
            </span>
            <span>
              <strong className="text-ivory">
                V
              </strong>{" "}
              Vitórias
            </span>
            <span>
              <strong className="text-ivory">
                E
              </strong>{" "}
              Empates
            </span>
            <span>
              <strong className="text-ivory">
                SG
              </strong>{" "}
              Saldo de gols
            </span>
            <span>
              <strong className="text-ivory">
                Pts
              </strong>{" "}
              Pontos
            </span>
          </div>
        </>
      )}
    </div>
  );
}
