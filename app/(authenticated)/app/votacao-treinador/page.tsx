"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  LoaderCircle,
  ShieldCheck,
  Trophy,
  X,
} from "lucide-react";
import { clientApi, formatDate } from "@/lib/client-api";
import type {
  CoachBallot,
  CoachVotingCandidate,
  CoachVotingCategory,
  CoachVotingContext,
} from "@/lib/awards-types";

type Selection = {
  teamId: string;
  candidateId: string;
  candidates: CoachVotingCandidate[];
  loading: boolean;
};

export default function CoachVotingPage() {
  const router = useRouter();
  const [context, setContext] = useState<CoachVotingContext | null>(null);
  const [selections, setSelections] = useState<Record<string, Selection>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    clientApi<CoachVotingContext>("/api/awards/coach-voting/context")
      .then((result) => {
        setContext(result);

        if (result.submitted || result.state === "SUBMITTED") {
          router.replace("/app/votacao-treinador/obrigado");
        }
      })
      .catch((err) =>
        setError(
          err instanceof Error
            ? err.message
            : "Você não possui acesso a esta votação.",
        ),
      )
      .finally(() => setLoading(false));
  }, [router]);

  function updateSelection(
    categoryId: string,
    patch: Partial<Selection>,
  ) {
    setSelections((current) => {
      const previous = current[categoryId];

      return {
        ...current,
        [categoryId]: {
          teamId: patch.teamId ?? previous?.teamId ?? "",
          candidateId: patch.candidateId ?? previous?.candidateId ?? "",
          candidates: patch.candidates ?? previous?.candidates ?? [],
          loading: patch.loading ?? previous?.loading ?? false,
        },
      };
    });
  }

  async function chooseTeam(
    category: CoachVotingCategory,
    teamId: string,
  ) {
    setError("");

    updateSelection(category.id, {
      teamId,
      candidateId: "",
      candidates: [],
      loading: Boolean(teamId),
    });

    if (!teamId) return;

    try {
      const candidates = await clientApi<CoachVotingCandidate[]>(
        `/api/awards/coach-voting/candidates?voteCategoryId=${encodeURIComponent(
          category.id,
        )}&teamId=${encodeURIComponent(teamId)}`,
      );

      setSelections((current) => {
        if (current[category.id]?.teamId !== teamId) return current;

        return {
          ...current,
          [category.id]: {
            ...current[category.id],
            candidateId:
              category.targetType === "COACH"
                ? candidates[0]?.id ?? ""
                : current[category.id]?.candidateId ?? "",
            candidates,
            loading: false,
          },
        };
      });
    } catch (err) {
      updateSelection(category.id, { loading: false });
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível carregar os candidatos.",
      );
    }
  }

  const requiredComplete = useMemo(() => {
    if (!context) return false;

    return context.voteCategories
      .filter((category) => category.required)
      .every((category) => selections[category.id]?.candidateId);
  }, [context, selections]);

  const summary = useMemo(() => {
    if (!context) return [];

    return context.voteCategories
      .map((category) => {
        const selection = selections[category.id];
        const candidate = selection?.candidates.find(
          (item) => item.id === selection.candidateId,
        );

        return candidate
          ? {
              category,
              candidate,
            }
          : null;
      })
      .filter(
        (
          item,
        ): item is {
          category: CoachVotingCategory;
          candidate: CoachVotingCandidate;
        } => Boolean(item),
      );
  }, [context, selections]);

  async function submitBallot() {
    if (!context || !requiredComplete) return;

    setSubmitting(true);
    setError("");

    try {
      await clientApi<CoachBallot>("/api/awards/coach-voting/ballot", {
        method: "POST",
        body: JSON.stringify({
          votes: summary.map(({ category, candidate }) => ({
            voteCategoryId: category.id,
            candidateId: candidate.id,
          })),
        }),
      });

      router.replace("/app/votacao-treinador/obrigado");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível registrar o voto.",
      );
      setSubmitting(false);
      setConfirming(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-80 items-center justify-center">
        <LoaderCircle className="size-9 animate-spin text-cyan" />
      </div>
    );
  }

  if (!context) {
    return (
      <section className="rounded-3xl border border-coral/20 bg-panel p-6">
        <h1 className="display-title text-3xl">Votação indisponível</h1>
        <p className="mt-3 text-sm text-muted">{error}</p>
        <Link href="/app" className="btn-ghost mt-6 w-full sm:w-auto">
          Voltar ao início
        </Link>
      </section>
    );
  }

  if (context.state !== "OPEN") {
    const stateMessage =
      context.state === "DRAFT"
        ? "A organização ainda está preparando a votação."
        : context.state === "SCHEDULED"
          ? `A votação abre em ${context.votingOpensAt ? formatDate(context.votingOpensAt, { dateStyle: "short", timeStyle: "short" }) : "breve"}.`
          : "A votação desta edição já foi encerrada.";

    return (
      <section className="rounded-3xl border border-white/8 bg-panel p-6 sm:p-8">
        <Trophy className="size-10 text-amber" />
        <h1 className="display-title mt-4 text-3xl">
          {context.editionName}
        </h1>
        <p className="mt-3 text-muted">{stateMessage}</p>
        <p className="mt-5 text-sm text-muted">
          Treinador: <strong className="text-ivory">{context.coachName}</strong>{" "}
          • {context.representedTeamName}
        </p>
      </section>
    );
  }

  return (
    <>
      <header className="mb-7">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-amber">
          <Trophy className="size-5" />
          Prêmio DNA Futsal
        </div>
        <h1 className="display-title mt-3 text-3xl sm:text-4xl">
          Votação dos treinadores
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
          Você está votando como <strong className="text-ivory">{context.coachName}</strong>,
          representando <strong className="text-ivory">{context.representedTeamName}</strong>.
          Para Goleiro, Fixo, Ala e Pivô, escolha o time e depois qualquer atleta
          daquele elenco. A posição é definida pelo seu voto. Para Técnico, escolha apenas a equipe.
        </p>
      </header>

      <div className="grid gap-5">
        {context.voteCategories.map((category) => {
          const selection = selections[category.id];

          return (
            <section
              key={category.id}
              className="rounded-3xl border border-white/8 bg-panel p-5 sm:p-6"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <small className="text-[10px] font-black uppercase tracking-wider text-cyan">
                    {category.targetType === "COACH"
                      ? "Comissão técnica"
                      : "Posição"}
                  </small>
                  <h2 className="mt-1 text-xl font-black text-ivory">
                    {category.label}
                  </h2>
                </div>
                {selection?.candidateId ? (
                  <CheckCircle2 className="size-6 text-cyan" />
                ) : null}
              </div>

              <div
                className={`mt-5 grid gap-4 ${
                  category.targetType === "COACH" ? "" : "sm:grid-cols-2"
                }`}
              >
                <label className="grid gap-1.5 text-sm font-bold">
                  Time
                  <select
                    className="field"
                    value={selection?.teamId ?? ""}
                    onChange={(event) =>
                      void chooseTeam(category, event.target.value)
                    }
                  >
                    <option value="">Selecione um time</option>
                    {context.teams
                      .filter(
                        (team) =>
                          category.targetType !== "COACH" ||
                          team.id !== context.representedTeamId,
                      )
                      .map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                  </select>
                </label>

                {category.targetType !== "COACH" ? (
                  <label className="grid gap-1.5 text-sm font-bold">
                    Atleta
                    <select
                      className="field"
                      value={selection?.candidateId ?? ""}
                      onChange={(event) =>
                        updateSelection(category.id, {
                          candidateId: event.target.value,
                        })
                      }
                      disabled={!selection?.teamId || selection.loading}
                    >
                      <option value="">
                        {selection?.loading
                          ? "Carregando..."
                          : "Selecione o atleta"}
                      </option>
                      {(selection?.candidates ?? []).map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {candidate.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </div>

              {category.targetType === "COACH" ? (
                <p className="mt-3 flex gap-2 text-xs text-muted">
                  <ShieldCheck className="size-4 shrink-0 text-cyan" />
                  O voto de Técnico é registrado diretamente para a equipe
                  escolhida. Sua própria equipe não aparece nesta lista.
                </p>
              ) : null}
            </section>
          );
        })}
      </div>

      {error ? (
        <p
          className="mt-5 rounded-xl border border-coral/25 bg-coral/8 px-4 py-3 text-sm text-[#ffb195]"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-7 flex justify-end">
        <button
          type="button"
          className="btn-primary w-full sm:w-auto"
          disabled={!requiredComplete}
          onClick={() => setConfirming(true)}
        >
          Registrar voto
        </button>
      </div>

      {confirming ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center">
          <div
            className="w-full max-w-xl rounded-3xl border border-white/10 bg-panel p-5 shadow-2xl sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-vote-title"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <small className="font-black uppercase tracking-wider text-amber">
                  Confirmação final
                </small>
                <h2
                  id="confirm-vote-title"
                  className="display-title mt-1 text-2xl"
                >
                  Confira seus votos
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="inline-flex size-10 items-center justify-center rounded-full text-muted hover:bg-white/5 hover:text-white"
                aria-label="Fechar confirmação"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-5 grid gap-2">
              {summary.map(({ category, candidate }) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between gap-4 rounded-xl bg-night/45 px-4 py-3"
                >
                  <span className="text-sm font-bold text-muted">
                    {category.label}
                  </span>
                  <span className="text-right text-sm font-black text-ivory">
                    {category.targetType === "COACH" ? (
                      candidate.teamName
                    ) : (
                      <>
                        {candidate.name}
                        <small className="block font-medium text-muted">
                          {candidate.teamName}
                        </small>
                      </>
                    )}
                  </span>
                </div>
              ))}
            </div>

            <p className="mt-5 text-xs leading-relaxed text-muted">
              Depois da confirmação o voto será definitivo e não poderá ser
              editado.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setConfirming(false)}
                disabled={submitting}
              >
                Revisar
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => void submitBallot()}
                disabled={submitting}
              >
                {submitting ? (
                  <LoaderCircle className="size-5 animate-spin" />
                ) : null}
                {submitting ? "Registrando..." : "Confirmar votos"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
