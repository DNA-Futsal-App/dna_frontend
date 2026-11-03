/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Award, CheckCircle2, Clock3, ExternalLink, LoaderCircle, PlayCircle, Trophy } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import type { VotingEdition, VotingContext, VotingBoard, VotingFinalist, MyVote, VideoTicket } from "@/lib/popular-voting-types";
import { votingContextKey, votingParams } from "@/lib/popular-voting-types";

// Consulta pública; voto exige sessão existente e ativa.
async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/popular-voting/${path}`, {
    ...init,
    credentials: "same-origin",
    cache: "no-store",
    headers: { Accept: "application/json", ...(init?.body ? { "Content-Type": "application/json" } : {}) },
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = (data as { detail?: string } | null)?.detail;
    throw Object.assign(new Error(detail ?? "Não foi possível concluir a solicitação."), { status: response.status });
  }
  return data as T;
}

type Field = "eventId" | "divisionId" | "categoryId" | "gender" | "contestCategory";
const fields: Field[] = ["eventId", "divisionId", "categoryId", "gender", "contestCategory"];
const dateText = (value: string | null) => value ? new Date(value).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—";

export default function PopularVotingPage() {
  const [editions, setEditions] = useState<VotingEdition[]>([]);
  const [editionId, setEditionId] = useState("");
  const [contexts, setContexts] = useState<VotingContext[]>([]);
  const [selected, setSelected] = useState<VotingContext | null>(null);
  const [board, setBoard] = useState<VotingBoard | null>(null);
  const [mine, setMine] = useState<string | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [media, setMedia] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadingBoard, setLoadingBoard] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    getJson<VotingEdition[]>("editions")
      .then((result) => { if (active) { setEditions(result); setEditionId(result[0]?.editionId ?? ""); } })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : "Falha ao carregar edições."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const edition = editions.find((item) => item.editionId === editionId);
  useEffect(() => {
    if (!editionId || edition?.status === "SCHEDULED") return;
    let active = true;
    getJson<VotingContext[]>(`editions/${editionId}/contexts`)
      .then((result) => { if (active) { setContexts(result); setSelected(result[0] ?? null); } })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : "Falha ao carregar categorias."); });
    return () => { active = false; };
  }, [editionId, edition?.status]);

  const selectionKey = selected ? votingContextKey(selected) : "";
  useEffect(() => {
    if (!editionId || !selected) return;
    let active = true;
    setLoadingBoard(true);
    setBoard(null);
    setMine(null);
    setLoggedIn(false);
    setMedia({});
    setNotice("");
    setError("");
    const query = votingParams(selected);
    void Promise.all([
      getJson<VotingBoard>(`editions/${editionId}/board?${query}`),
      getJson<MyVote>(`editions/${editionId}/my-vote?${query}`).catch((err: unknown) => {
        if ((err as { status?: number }).status === 401) return null;
        throw err;
      }),
    ]).then(([result, myVote]) => {
      if (!active) return;
      setBoard(result);
      setMine(myVote?.entryId ?? null);
      setLoggedIn(myVote !== null);
    }).catch((err: unknown) => {
      if (active) setError(err instanceof Error ? err.message : "Não foi possível carregar os finalistas.");
    }).finally(() => { if (active) setLoadingBoard(false); });
    return () => { active = false; };
    // As chaves identificam o grupo; campos derivados não devem disparar outra consulta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editionId, selectionKey]);

  function choose(field: Field, raw: string) {
    if (!selected) return;
    const index = fields.indexOf(field);
    const value: string | number = index <= 2 ? Number(raw) : raw;
    const match = contexts.find((item) => item[field] === value
      && fields.slice(0, index).every((previous) => item[previous] === selected[previous]));
    if (match) setSelected(match);
  }

  function options(field: Field) {
    if (!selected) return [];
    const index = fields.indexOf(field);
    const filtered = contexts.filter((item) => fields.slice(0, index)
      .every((previous) => item[previous] === selected[previous]));
    return Array.from(new Map(filtered.map((item) => [String(item[field]), item])).values());
  }

  async function loadVideo(finalist: VotingFinalist) {
    setBusy(finalist.entryId);
    setError("");
    try {
      const ticket = await getJson<VideoTicket>(`editions/${editionId}/media/${finalist.entryId}`);
      setMedia((previous) => ({ ...previous, [finalist.entryId]: ticket.url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível abrir o vídeo.");
    } finally { setBusy(null); }
  }

  async function castVote(entryId: string) {
    if (!selected || !board || board.status !== "OPEN" || mine || busy) return;
    if (!window.confirm("Confirmar seu voto? Depois de enviado, ele não poderá ser alterado.")) return;
    setBusy(entryId);
    setError("");
    try {
      await getJson<MyVote>(`editions/${editionId}/vote`, {
        method: "POST",
        body: JSON.stringify({ context: {
          eventId: selected.eventId, divisionId: selected.divisionId, categoryId: selected.categoryId,
          gender: selected.gender, contestCategory: selected.contestCategory,
        }, entryId }),
      });
      setMine(entryId);
      setLoggedIn(true);
      setNotice("Voto registrado! Obrigado por participar da votação popular.");
    } catch (err) {
      const errorWithStatus = err as Error & { status?: number };
      if (errorWithStatus.status === 401) {
        setLoggedIn(false);
        setError("Faça login para votar. Depois retorne a esta página.");
      } else {
        setError(err instanceof Error ? err.message : "Não foi possível registrar seu voto.");
      }
    } finally { setBusy(null); }
  }

  return <main className="min-h-dvh bg-night px-4 pb-20 pt-6 text-ivory sm:px-6 lg:px-8">
    <div className="mx-auto max-w-7xl">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3" aria-label="DNA Futsal — início"><BrandLogo size={48}/><strong className="display-title text-lg">DNA Futsal</strong></Link>
        <div className="flex gap-2"><Link href="/entrar?returnTo=/premio/votacao" className="btn-ghost">Entrar</Link><Link href="/cadastro" className="btn-ghost">Criar conta</Link></div>
      </header>
      <section className="mb-8 mt-12 max-w-4xl">
        <p className="eyebrow"><Trophy className="size-4"/> Prêmio Legacy • Júri popular</p>
        <h1 className="display-title mt-3 text-4xl font-black sm:text-6xl">O seu voto faz a <span className="text-cyan">diferença.</span></h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">Assista aos vídeos dos três finalistas escolhidos pelo júri administrativo e vote no seu favorito. Cada conta tem direito a um voto por categoria.</p>
      </section>

      {loading ? <div className="py-14 text-center"><LoaderCircle className="mx-auto size-8 animate-spin text-cyan"/></div> : !edition ? (
        <section className="surface rounded-3xl p-8"><Clock3 className="mb-3 size-7 text-amber"/><h2 className="text-xl font-black">Votação popular em breve</h2><p className="mt-2 text-sm text-muted">A organização ainda não programou a votação dos finalistas.</p></section>
      ) : <>
        <section className="surface rounded-3xl p-5 sm:p-7">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div><h2 className="text-xl font-black">Escolha sua categoria</h2><p className="mt-2 text-xs text-muted">Abertura: {dateText(edition.opensAt)} • Encerramento: {dateText(edition.closesAt)} (São Paulo)</p></div>
            <span className="rounded-full border border-cyan/25 px-3 py-1.5 text-xs font-bold text-cyan">{edition.status === "OPEN" ? "Votação aberta" : edition.status === "SCHEDULED" ? "Em breve" : "Votação encerrada"}</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <label className="grid gap-1.5 text-sm font-semibold">Edição
              <select className="field" value={editionId} onChange={(e) => { setEditionId(e.target.value);setContexts([]);setSelected(null);setBoard(null);setError(""); }}>
                {editions.map((item) => <option key={item.editionId} value={item.editionId}>{item.editionName}</option>)}
              </select>
            </label>
            {selected && <>
              <label className="grid gap-1.5 text-sm font-semibold">Campeonato (FPFS)
                <select className="field" value={selected.eventId} onChange={(e) => choose("eventId", e.target.value)}>{options("eventId").map((item) => <option key={item.eventId} value={item.eventId}>Evento #{item.eventId}</option>)}</select>
              </label>
              <label className="grid gap-1.5 text-sm font-semibold">Divisão
                <select className="field" value={selected.divisionId} onChange={(e) => choose("divisionId", e.target.value)}>{options("divisionId").map((item) => <option key={item.divisionId} value={item.divisionId}>{item.divisionName}</option>)}</select>
              </label>
              <label className="grid gap-1.5 text-sm font-semibold">Categoria do campeonato
                <select className="field" value={selected.categoryId} onChange={(e) => choose("categoryId", e.target.value)}>{options("categoryId").map((item) => <option key={item.categoryId} value={item.categoryId}>{item.categoryName}</option>)}</select>
              </label>
              <label className="grid gap-1.5 text-sm font-semibold">Gênero
                <select className="field" value={selected.gender} onChange={(e) => choose("gender", e.target.value)}>{options("gender").map((item) => <option key={item.gender} value={item.gender}>{item.gender === "MALE" ? "Masculino" : "Feminino"}</option>)}</select>
              </label>
              <label className="grid gap-1.5 text-sm font-semibold">Categoria do prêmio
                <select className="field" value={selected.contestCategory} onChange={(e) => choose("contestCategory", e.target.value)}>{options("contestCategory").map((item) => <option key={item.contestCategory} value={item.contestCategory}>{item.contestCategoryLabel}</option>)}</select>
              </label>
            </>}
          </div>
          {edition.status === "SCHEDULED" ? <p className="mt-5 text-sm text-muted">Os finalistas serão liberados quando a votação começar.</p> : !selected ? <p className="mt-5 text-sm text-muted">Ainda não há grupos de finalistas publicados nesta edição.</p> : null}
        </section>

        {error && <p role="alert" className="mt-6 rounded-2xl border border-coral/30 bg-coral/5 p-4 text-sm text-coral">{error}</p>}
        {notice && <p role="status" className="mt-6 rounded-2xl border border-cyan/30 bg-cyan/5 p-4 text-sm text-cyan">{notice}</p>}
        {selected && <>
          <div className="mt-8 flex items-center justify-between gap-3"><h2 className="display-title text-2xl">Os três finalistas</h2><span className="text-xs text-muted">{selected.contestCategoryLabel}</span></div>
          {loadingBoard ? <div className="py-12 text-center"><LoaderCircle className="mx-auto size-8 animate-spin text-cyan"/></div> : board && <>
            {mine && <div className="mt-4 flex items-center gap-2 rounded-2xl border border-cyan/20 bg-cyan/5 p-4 text-sm text-cyan"><CheckCircle2 className="size-5"/> Seu voto nesta categoria já foi registrado.</div>}
            {!loggedIn && board.status === "OPEN" && <div className="mt-4 rounded-2xl border border-amber/20 p-4 text-sm text-muted">Para votar, <Link href="/entrar?returnTo=/premio/votacao" className="font-bold text-amber underline">entre na sua conta</Link> ou <Link href="/cadastro" className="font-bold text-amber underline">cadastre-se</Link>. Você pode assistir aos vídeos sem login.</div>}
            <div className="mt-5 grid gap-5 lg:grid-cols-3">{board.finalists.map((item) => {
              const external = item.externalUrl && /^https?:\/\//i.test(item.externalUrl) ? item.externalUrl : null;
              return <article key={item.entryId} className="surface overflow-hidden rounded-3xl border border-white/10">
                <div className="p-5"><div className="mb-3 flex items-center gap-2"><Award className="size-5 text-amber"/><span className="text-xs font-black uppercase tracking-wider text-amber">Finalista</span></div>
                  <h3 className="min-h-14 text-xl font-black">{item.athleteName}</h3><p className="mt-1 truncate text-sm text-muted">{item.teamName}</p>
                  <div className="mt-5 flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-black/50">
                    {media[item.entryId] ? <video key={media[item.entryId]} controls playsInline preload="metadata" className="h-full w-full object-contain" src={media[item.entryId]}/> :
                     item.sourceType === "UPLOAD" ? <button type="button" className="btn-ghost" disabled={busy !== null} onClick={() => void loadVideo(item)}><PlayCircle className="size-4"/> Assistir ao vídeo</button> :
                     external ? <a href={external} target="_blank" rel="noopener noreferrer" className="btn-ghost"><ExternalLink className="size-4"/> Ver vídeo externo</a> : <p className="text-sm text-coral">Vídeo indisponível</p>}
                  </div>
                  {board.status === "CLOSED" ? <p className="mt-5 text-lg font-black text-ivory">{item.votes ?? 0} votos <span className="text-xs font-normal text-muted">({board.totalVotes ? ((100 * (item.votes ?? 0)) / board.totalVotes).toFixed(1) : "0.0"}%)</span></p> :
                    <button type="button" disabled={busy !== null || board.status !== "OPEN" || Boolean(mine) || !loggedIn}
                      className="btn-primary mt-5 w-full disabled:opacity-50" onClick={() => void castVote(item.entryId)}>
                      {busy === item.entryId ? <LoaderCircle className="size-4 animate-spin"/> : mine === item.entryId ? <CheckCircle2 className="size-4"/> : <Trophy className="size-4"/>}
                      {mine === item.entryId ? "Seu voto" : mine ? "Voto encerrado para você" : "Votar neste vídeo"}
                    </button>}
                </div>
              </article>;
            })}</div>
            {board.status === "CLOSED" && <p className="mt-5 text-sm text-muted">A votação foi encerrada. A apuração pública corresponde aos votos registrados no banco.</p>}
          </>}
        </>}
      </>}
      <footer className="mt-16 border-t border-white/10 py-6 text-center text-xs text-muted">DNA Futsal • Prêmio Legacy • Votação pública</footer>
    </div>
  </main>;
}
