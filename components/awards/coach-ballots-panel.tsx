"use client";

import { useEffect, useState } from "react";
import { clientApi, formatDate } from "@/lib/client-api";
import type { CoachCompetitionContext } from "@/lib/use-coach-competition-labels";

type VoteChoice = {
  voteCategoryId: string;
  voteCategoryCode: string;
  voteCategoryLabel: string;
  candidateId: string;
  candidateName: string;
  teamId: string;
  teamName: string;
};

type ContextBallot = {
  contextId: string;
  ballotId: string;
  eventId: number;
  divisionId: number;
  categoryId: number;
  teamId: string;
  teamName: string;
  submittedAt: string;
  votes: VoteChoice[];
};

type CoachBallotsResponse = {
  credentialId: string;
  editionId: string;
  ballots: ContextBallot[];
};

type Props = {
  editionId: string;
  credentialId: string;
  season: number;
  competitionLabel: (item: CoachCompetitionContext) => string;
};

/** Carrega os votos apenas enquanto o administrador expande o card do técnico. */
export function CoachBallotsPanel({ editionId, credentialId, season, competitionLabel }: Props) {
  const [data, setData] = useState<CoachBallotsResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    clientApi<CoachBallotsResponse>(
      `/api/admin/awards/editions/${encodeURIComponent(editionId)}/coach-voters/${encodeURIComponent(credentialId)}/ballots`,
      { signal: controller.signal, cache: "no-store" },
    )
      .then((result) => { if (!controller.signal.aborted) setData(result); })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "Falha ao consultar os votos do treinador.");
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [editionId, credentialId]);

  return (
    <section className="mt-4 grid gap-3 rounded-xl border border-cyan/25 bg-panel/70 p-4" aria-label="Votos do treinador">
      <h4 className="text-sm font-black text-cyan">Votos registrados</h4>
      {loading ? <p className="text-sm text-muted" role="status">Carregando votos...</p> : null}
      {error ? <p className="text-sm text-coral" role="alert">{error}</p> : null}
      {!loading && !error && data?.ballots.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma cédula registrada para este treinador nesta edição.</p>
      ) : null}
      {data?.ballots.map((ballot) => (
        <article key={ballot.ballotId} className="grid gap-3 rounded-xl border border-white/10 bg-night/35 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h5 className="font-bold">
                {competitionLabel({
                  season,
                  eventId: ballot.eventId,
                  divisionId: ballot.divisionId,
                  categoryId: ballot.categoryId,
                })}
              </h5>
              <p className="text-xs text-muted">Clube representado: {ballot.teamName}</p>
            </div>
            <time className="text-xs text-muted" dateTime={ballot.submittedAt}>
              Registrado em {formatDate(ballot.submittedAt, { dateStyle: "short", timeStyle: "short" })}
            </time>
          </div>
          {ballot.votes.length === 0 ? (
            <p className="text-xs text-muted">Cédula registrada sem escolhas disponíveis.</p>
          ) : (
            <dl className="grid gap-2 sm:grid-cols-2">
              {ballot.votes.map((vote) => (
                <div key={vote.voteCategoryId} className="rounded-lg border border-white/8 px-3 py-2">
                  <dt className="text-xs font-bold text-muted">{vote.voteCategoryLabel}</dt>
                  <dd className="mt-1 text-sm font-bold text-ivory">{vote.candidateName}</dd>
                  <dd className="text-xs text-muted">{vote.teamName}</dd>
                </div>
              ))}
            </dl>
          )}
        </article>
      ))}
    </section>
  );
}
