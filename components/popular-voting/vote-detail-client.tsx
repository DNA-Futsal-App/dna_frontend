/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Clock3, ExternalLink, LoaderCircle, PlayCircle, Trophy } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import {
  popularVotingRequest, votingContextKey, votingContextUrl, votingDate, votingParams, votingStatusLabel,
} from "@/lib/popular-voting-types";
import type { MyVote, VideoTicket, VotingBoard, VotingContext, VotingFinalist } from "@/lib/popular-voting-types";

type Props = { editionId: string; eventId: number; divisionId: number; categoryId: number;
  gender: "MALE" | "FEMALE"; contestCategory: VotingContext["contestCategory"] };

export function VoteDetailClient(props: Props) {
  const { editionId, eventId, divisionId, categoryId, gender, contestCategory } = props;
  const [context, setContext] = useState<VotingContext | null>(null);
  const [board, setBoard] = useState<VotingBoard | null>(null);
  const [mine, setMine] = useState<string | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [media, setMedia] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmedVoteAthlete, setConfirmedVoteAthlete] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    popularVotingRequest<VotingContext[]>(`editions/${editionId}/contexts`)
      .then((items) => {
        if (!active) return;
        const found = items.find((item) => item.eventId === eventId && item.divisionId === divisionId
          && item.categoryId === categoryId && item.gender === gender && item.contestCategory === contestCategory);
        if (!found) { setError("Esta disputa não foi programada ou não está disponível."); return; }
        setContext(found);
      })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : "Não foi possível consultar a disputa."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [editionId, eventId, divisionId, categoryId, gender, contestCategory]);

  // Atualizar automaticamente uma disputa que estava agendada quando a página foi aberta.
  useEffect(() => {
    if (!context || context.status !== "SCHEDULED") return;
    let active = true;
    const interval = window.setInterval(() => {
      void popularVotingRequest<VotingContext[]>(`editions/${editionId}/contexts`).then((items) => {
        if (!active) return;
        const updated = items.find((item) => item.eventId === eventId && item.divisionId === divisionId
          && item.categoryId === categoryId && item.gender === gender
          && item.contestCategory === contestCategory);
        if (updated) setContext(updated);
      }).catch(() => { /* tentar novamente na próxima atualização */ });
    }, 60_000);
    return () => { active = false; window.clearInterval(interval); };
  }, [editionId, eventId, divisionId, categoryId, gender, contestCategory, context]);

  const key = context ? votingContextKey(context) : "";
  useEffect(() => {
    if (!context || context.status === "SCHEDULED") return;
    let active = true;
    const params = votingParams(context);
    void Promise.all([
      popularVotingRequest<VotingBoard>(`editions/${editionId}/board?${params}`),
      popularVotingRequest<MyVote>(`editions/${editionId}/my-vote?${params}`)
        .catch((err: unknown) => {
          if ((err as { status?: number }).status === 401) return null;
          throw err;
        }),
    ]).then(([value, vote]) => {
      if (!active) return;
      setBoard(value);
      setMine(vote?.entryId ?? null);
      setLoggedIn(vote !== null);
    }).catch((err: unknown) => {
      if (active) setError(err instanceof Error ? err.message : "Não foi possível carregar os vídeos.");
    });
    return () => { active = false; };
    // Contexto identificado de forma estável por cinco dimensões.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editionId, key, context?.status]);

  async function openVideo(item: VotingFinalist) {
    setBusy(item.entryId);
    setError("");
    try {
      const ticket = await popularVotingRequest<VideoTicket>(`editions/${editionId}/media/${item.entryId}`);
      setMedia((previous) => ({ ...previous, [item.entryId]: ticket.url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível abrir o vídeo privado.");
    } finally { setBusy(null); }
  }

  async function castVote(item: VotingFinalist) {
    if (!context || mine || !loggedIn || busy !== null || board?.status !== "OPEN") return;
    if (!window.confirm(`Confirmar voto em ${item.athleteName}? O voto é definitivo.`)) return;
    setBusy(item.entryId);
    setError("");
    try {
      await popularVotingRequest<MyVote>(`editions/${editionId}/vote`, {
        method: "POST", body: JSON.stringify({
          context: { eventId, divisionId, categoryId, gender, contestCategory }, entryId: item.entryId,
        }),
      });
      setMine(item.entryId);
      setNotice("Seu voto foi registrado com sucesso.");
      setConfirmedVoteAthlete(item.athleteName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível confirmar seu voto.");
    } finally { setBusy(null); }
  }

  const loginLink = `/entrar?returnTo=${encodeURIComponent(votingContextUrl(editionId, { eventId, divisionId, categoryId, gender, contestCategory }))}`;
  return <main className="min-h-dvh bg-night px-4 pb-20 pt-6 text-ivory sm:px-6">
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-3"><BrandLogo size={48}/><strong className="display-title text-lg">DNA Futsal</strong></Link>
        <Link href="/premio/votacao" className="btn-ghost"><ArrowLeft className="size-4"/> Todas as disputas</Link>
      </header>
      {error && <p role="alert" className="rounded-2xl border border-coral/30 p-4 text-sm text-coral">{error}</p>}
      {notice && <p role="status" className="rounded-2xl border border-cyan/30 p-4 text-sm text-cyan">{notice}</p>}
      {loading ? <LoaderCircle className="size-8 animate-spin text-cyan"/> : context && <>
        <section className="surface rounded-3xl p-6 sm:p-9">
          <p className="eyebrow"><Trophy className="size-4"/> Prêmio Legacy • Votação popular</p>
          <h1 className="display-title mt-4 text-3xl sm:text-5xl">{context.contestCategoryLabel}</h1>
          <p className="mt-3 text-muted">{context.divisionName} • {context.categoryName} • {gender === "FEMALE" ? "Feminino" : "Masculino"} • Campeonato #{context.eventId}</p>
          <div className="mt-5 flex flex-wrap gap-3 text-xs">
            <span className="rounded-full border border-cyan/30 px-3 py-2 font-bold text-cyan">{votingStatusLabel(context.status)}</span>
            <span className="inline-flex items-center gap-2 text-muted"><Clock3 className="size-4"/> {votingDate(context.opensAt)} até {votingDate(context.closesAt)} (Brasília)</span>
          </div>
        </section>
        {context.status === "SCHEDULED" ? <section className="surface rounded-2xl p-8">
          <h2 className="text-xl font-black">Esta votação ainda não começou</h2>
          <p className="mt-3 text-muted">Os vídeos serão liberados na data programada. Volte depois da abertura.</p>
        </section> : !board ? <LoaderCircle className="size-8 animate-spin text-cyan"/> : <>
          {mine && <p className="flex items-center gap-2 rounded-xl border border-cyan/20 p-4 text-sm text-cyan"><CheckCircle2 className="size-5"/> Você já votou nesta categoria.</p>}
          {!loggedIn && board.status === "OPEN" && (
            <section aria-label="Login necessário para votar" className="relative overflow-hidden rounded-3xl border border-amber/40 bg-linear-to-br from-amber/15 via-panel to-night p-6 shadow-[0_20px_50px_rgba(0,0,0,.22)] sm:p-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl">
                  <p className="inline-flex items-center rounded-full border border-amber/40 bg-amber/10 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-amber">Login obrigatório para votar</p>
                  <h2 className="display-title mt-4 text-2xl font-black text-ivory sm:text-3xl">Quer votar no seu atleta favorito?</h2>
                  <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
                    Assista aos vídeos gratuitamente. Para registrar seu voto, entre na sua conta do DNA Futsal.
                  </p>
                </div>
                <Link href={loginLink} className="btn-primary inline-flex min-h-14 w-full shrink-0 items-center justify-center px-6 text-center text-base font-black sm:w-auto lg:min-w-64">
                  Fazer login para votar
                </Link>
              </div>
              <p className="mt-5 border-t border-amber/20 pt-4 text-xs text-muted">Após entrar, você voltará automaticamente para esta votação.</p>
            </section>
          )}
          {board.status === "CLOSED" && <p role="status" className="rounded-xl border border-cyan/20 p-4 text-sm text-muted">
            Votação encerrada. Os resultados serão divulgados no dia da premição.
          </p>}
          <h2 className="display-title pt-3 text-2xl">Os {board.finalists.length} finalistas</h2>
          <div className={`grid gap-5 ${board.finalists.length === 4 ? "md:grid-cols-2 xl:grid-cols-4" : "lg:grid-cols-3"}`}>{board.finalists.map((item) => {
            const external = item.externalUrl && /^https?:\/\//i.test(item.externalUrl) ? item.externalUrl : null;
            const isChosen = mine === item.entryId;
            const isOther = mine !== null && !isChosen;
            return <article key={item.entryId}
              className={`surface relative rounded-3xl border p-5 transition-all duration-300 ${
                isChosen
                  ? "border-cyan/70 bg-cyan/10 ring-2 ring-cyan/40 shadow-[0_0_36px_rgba(34,211,238,0.12)]"
                  : isOther ? "border-white/5 opacity-60 saturate-50" : "border-white/10"
              }`}>
              {isChosen && <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan/40 bg-cyan/15 px-3 py-1.5 text-xs font-black text-cyan">
                <CheckCircle2 className="size-4"/> Seu voto registrado
              </p>}
              <p className="text-xs font-black uppercase tracking-widest text-amber">Finalista</p>
              <h3 className="mt-3 text-2xl font-black">{item.athleteName}</h3>
              <p className="mt-2 text-sm text-muted">{item.teamName}</p>
              <div className="mt-5 flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-black/50">
                {media[item.entryId] ? <video controls playsInline preload="metadata" className="h-full w-full object-contain" src={media[item.entryId]}/> :
                  item.sourceType === "UPLOAD" ? <button className="btn-ghost" type="button" disabled={busy !== null} onClick={() => void openVideo(item)}><PlayCircle className="size-4"/> Assistir ao vídeo</button> :
                  external ? <a className="btn-ghost" href={external} target="_blank" rel="noopener noreferrer"><ExternalLink className="size-4"/> Assistir externamente</a> :
                  <span className="text-sm text-coral">Vídeo indisponível</span>}
              </div>
              {board.status === "CLOSED" ? <p className="mt-5 text-sm font-semibold text-muted">Votação encerrada</p> :
                <button type="button" className="btn-primary mt-5 w-full" disabled={busy !== null || Boolean(mine) || !loggedIn || board.status !== "OPEN"}
                  onClick={() => void castVote(item)}>{mine === item.entryId ? "Seu voto" : mine ? "Voto registrado" : !loggedIn ? "Faça login para votar" : "Votar neste vídeo"}</button>}
            </article>;
          })}</div>
        </>}
      </>}
    </div>
    {confirmedVoteAthlete && (
      <ConfirmationDialog
        titleId="dna-vote-success-title"
        descriptionId="dna-vote-success-description"
        busy={false}
        onDismiss={() => setConfirmedVoteAthlete(null)}
      >
        <div className="space-y-5 text-center">
          <span aria-hidden="true" className="mx-auto flex size-16 items-center justify-center rounded-full bg-cyan/15 text-cyan">
            <CheckCircle2 className="size-9" />
          </span>
          <div className="space-y-2">
            <h2 id="dna-vote-success-title" className="display-title text-2xl font-black text-ivory sm:text-3xl">
              Voto registrado com sucesso!
            </h2>
            <p id="dna-vote-success-description" className="text-sm leading-relaxed text-muted sm:text-base">
              Seu voto em <strong className="text-ivory">{confirmedVoteAthlete}</strong> foi confirmado. Obrigado por participar do Prêmio Legacy.
            </p>
          </div>
          <button
            type="button"
            data-dialog-cancel
            onClick={() => setConfirmedVoteAthlete(null)}
            className="btn-primary min-h-12 w-full justify-center sm:w-auto sm:min-w-56"
          >
            Continuar explorando
          </button>
        </div>
      </ConfirmationDialog>
    )}
  </main>;
}
