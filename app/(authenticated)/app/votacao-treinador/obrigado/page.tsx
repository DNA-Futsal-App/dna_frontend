"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  LoaderCircle,
  Trophy,
} from "lucide-react";
import { clientApi, formatDate } from "@/lib/client-api";
import type { CoachBallot } from "@/lib/awards-types";

export default function CoachVotingThanksPage() {
  const [ballot, setBallot] = useState<CoachBallot | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    clientApi<CoachBallot>("/api/awards/coach-voting/ballot")
      .then(setBallot)
      .catch((err) =>
        setError(
          err instanceof Error
            ? err.message
            : "Não foi possível carregar o voto registrado.",
        ),
      );
  }, []);

  return (
    <section className="mx-auto max-w-2xl rounded-3xl border border-cyan/15 bg-panel p-6 text-center sm:p-8">
      <div className="mx-auto inline-flex size-16 items-center justify-center rounded-full bg-cyan/10">
        <CheckCircle2 className="size-9 text-cyan" />
      </div>

      <div className="mt-5 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-[.16em] text-amber">
        <Trophy className="size-4" />
        Prêmio DNA Futsal
      </div>

      <h1 className="display-title mt-3 text-3xl sm:text-4xl">
        Obrigado pelo seu voto!
      </h1>

      <p className="mt-3 text-sm leading-relaxed text-muted">
        Seu voto foi registrado. A cédula agora está bloqueada para edição.
      </p>

      {!ballot && !error ? (
        <LoaderCircle className="mx-auto mt-8 size-7 animate-spin text-cyan" />
      ) : null}

      {ballot ? (
        <div className="mt-7 text-left">
          <p className="mb-3 text-center text-xs text-muted">
            Registrado em{" "}
            {formatDate(ballot.submittedAt, {
              dateStyle: "short",
              timeStyle: "short",
            })}
          </p>

          <div className="grid gap-2">
            {ballot.votes.map((vote) => (
              <div
                key={vote.voteCategoryId}
                className="flex items-center justify-between gap-4 rounded-xl border border-white/7 bg-night/40 px-4 py-3"
              >
                <span className="text-sm font-bold text-muted">
                  {vote.voteCategoryLabel}
                </span>
                <span className="text-right text-sm font-black text-ivory">
                  {vote.candidateName}
                  <small className="block font-medium text-muted">
                    {vote.teamName}
                  </small>
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="mt-6 text-sm text-coral">{error}</p>
      ) : null}

      <Link href="/app" className="btn-ghost mt-7 w-full sm:w-auto">
        Voltar ao DNA Futsal
      </Link>
    </section>
  );
}
