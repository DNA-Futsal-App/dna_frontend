/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, LoaderCircle, PlayCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { clientApi } from "@/lib/client-api";
import type { AdminAwardEdition, AdminAwardMediaTicket } from "@/lib/admin-awards-types";

type Gender = "MALE" | "FEMALE";
type ContestCategory = "BEAUTIFUL_GOAL" | "BEST_DRIBBLE" | "FREE_KICK_GOAL" | "BEST_SAVE";
type Context = {
  eventId: number;
  divisionId: number;
  divisionName: string;
  categoryId: number;
  categoryName: string;
  gender: Gender;
  contestCategory: ContestCategory;
  contestCategoryLabel: string;
};
type Athlete = {
  registrationId: string;
  entryId: string;
  registrationNumber: number;
  representativeName: string;
  representativeEmail: string | null;
  athleteName: string;
  athleteInstagram: string;
  teamName: string;
  reviewStatus: "APPROVED" | "PENDING_REVIEW" | "REJECTED";
  mediaStatus: string;
  sourceType: "UPLOAD" | "LINK";
  externalUrl: string | null;
  averageScore: number | null;
  scoredAdministrators: number;
  activeAdministrators: number;
  allAdministratorsScored: boolean;
};
type Report = { context: Context; activeAdministrators: number; totalEntries: number; entries: Athlete[] };
type Limit = 3 | 5 | 10 | "ALL";
const fields = ["eventId", "divisionId", "categoryId", "gender", "contestCategory"] as const;
type Field = typeof fields[number];
const statusLabels: Record<Athlete["reviewStatus"], string> = {
  APPROVED: "Aprovado", PENDING_REVIEW: "Aguardando aprovação", REJECTED: "Rejeitado",
};
function params(context: Context): string {
  return new URLSearchParams({ eventId: String(context.eventId), divisionId: String(context.divisionId),
    categoryId: String(context.categoryId), gender: context.gender,
    contestCategory: context.contestCategory }).toString();
}
function key(context: Context): string {
  return fields.map((field) => String(context[field])).join("|");
}

export default function AwardPreVoteAssessmentPage() {
  const [editions, setEditions] = useState<AdminAwardEdition[]>([]);
  const [editionId, setEditionId] = useState("");
  const [contexts, setContexts] = useState<Context[]>([]);
  const [selected, setSelected] = useState<Context | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [limit, setLimit] = useState<Limit>("ALL");
  const [videoUrls, setVideoUrls] = useState<Record<string, string>>({});
  const [busyVideo, setBusyVideo] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    clientApi<AdminAwardEdition[]>("/api/admin/awards/editions", { cache: "no-store" })
      .then((items) => { if (active) { setEditions(items); setEditionId(items[0]?.id ?? ""); } })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : "Erro ao carregar edições."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!editionId) return;
    let active = true;
    setContexts([]);
    setSelected(null);
    setReport(null);
    setError("");
    clientApi<Context[]>(`/api/admin/awards/editions/${editionId}/pre-vote/assessment-contexts`, { cache: "no-store" })
      .then((items) => { if (active) { setContexts(items); setSelected(items[0] ?? null); } })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : "Erro ao carregar modalidades."); });
    return () => { active = false; };
  }, [editionId]);

  const selectionKey = selected ? key(selected) : "";
  useEffect(() => {
    if (!editionId || !selected) return;
    let active = true;
    setReport(null);
    setVideoUrls({});
    setLoadingReport(true);
    setError("");
    clientApi<Report>(`/api/admin/awards/editions/${editionId}/pre-vote/assessment-report?${params(selected)}`,
      { cache: "no-store" })
      .then((value) => { if (active) setReport(value); })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : "Erro ao carregar ranking."); })
      .finally(() => { if (active) setLoadingReport(false); });
    return () => { active = false; };
    // A identidade da disputa é representada pelas cinco dimensões.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editionId, selectionKey, revision]);

  function options(field: Field): Context[] {
    if (!selected) return [];
    const index = fields.indexOf(field);
    const found = contexts.filter((item) => fields.slice(0, index).every((previous) => item[previous] === selected[previous]));
    return Array.from(new Map(found.map((item) => [String(item[field]), item])).values());
  }
  function choose(field: Field, raw: string) {
    if (!selected) return;
    const index = fields.indexOf(field);
    const value: string | number = index < 3 ? Number(raw) : raw;
    const found = contexts.find((item) => item[field] === value &&
      fields.slice(0, index).every((previous) => item[previous] === selected[previous]));
    if (found) { setSelected(found); setLimit("ALL"); }
  }

  async function watchVideo(item: Athlete) {
    setBusyVideo(item.entryId);
    setError("");
    try {
      const ticket = await clientApi<AdminAwardMediaTicket>(
        `/api/admin/awards/registrations/${item.registrationId}/entries/${item.entryId}/media-ticket`,
        { method: "POST" });
      setVideoUrls((previous) => ({ ...previous, [item.entryId]: ticket.url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível abrir o vídeo privado.");
    } finally { setBusyVideo(null); }
  }

  const visible = report ? (limit === "ALL" ? report.entries : report.entries.slice(0, limit)) : [];
  return <div className="mx-auto max-w-7xl space-y-6">
    <header>
      <Link href="/app/admin/premio-dna" className="inline-flex items-center gap-2 text-sm font-bold text-muted hover:text-ivory">
        <ArrowLeft className="size-4"/> Voltar ao painel do prêmio
      </Link>
      <p className="eyebrow mt-6"><ShieldCheck className="size-4"/> Acesso administrativo</p>
      <h1 className="display-title mt-2 text-4xl">Pré-votação do Prêmio DNA Futsal</h1>
      <p className="mt-2 max-w-3xl text-sm text-muted">Consulte todas as inscrições enviadas e acompanhe as médias e a conclusão das avaliações.</p>
    </header>
    <nav aria-label="Subabas da pré-votação" className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
      <Link href="/app/admin/premio-dna/pre-votacao" className="btn-ghost">Atribuir notas</Link>
      <span aria-current="page" className="rounded-xl border border-cyan/40 bg-cyan/10 px-4 py-2 text-sm font-bold text-cyan">Ranking e inscritos</span>
    </nav>
    {error && <p role="alert" className="rounded-xl border border-coral/30 p-4 text-sm text-coral">{error}</p>}
    <section className="surface rounded-3xl p-5 sm:p-7">
      {loading ? <LoaderCircle className="size-6 animate-spin text-cyan"/> : <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <label className="grid gap-2 text-sm font-bold">Edição
          <select className="field" value={editionId} onChange={(event) => setEditionId(event.target.value)}>
            {editions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        {selected && <>
          <label className="grid gap-2 text-sm font-bold">Campeonato
            <select className="field" value={selected.eventId} onChange={(event) => choose("eventId", event.target.value)}>
              {options("eventId").map((item) => <option key={item.eventId} value={item.eventId}>Evento #{item.eventId}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold">Divisão
            <select className="field" value={selected.divisionId} onChange={(event) => choose("divisionId", event.target.value)}>
              {options("divisionId").map((item) => <option key={item.divisionId} value={item.divisionId}>{item.divisionName}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold">Categoria
            <select className="field" value={selected.categoryId} onChange={(event) => choose("categoryId", event.target.value)}>
              {options("categoryId").map((item) => <option key={item.categoryId} value={item.categoryId}>{item.categoryName}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold">Gênero
            <select className="field" value={selected.gender} onChange={(event) => choose("gender", event.target.value)}>
              {options("gender").map((item) => <option key={item.gender} value={item.gender}>{item.gender === "MALE" ? "Masculino" : "Feminino"}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold">Categoria do prêmio
            <select className="field" value={selected.contestCategory} onChange={(event) => choose("contestCategory", event.target.value)}>
              {options("contestCategory").map((item) => <option key={item.contestCategory} value={item.contestCategory}>{item.contestCategoryLabel}</option>)}
            </select>
          </label>
        </>}
      </div>}
      {!loading && contexts.length === 0 && !error && <p className="mt-3 text-sm text-muted">Nenhuma inscrição enviada nesta edição.</p>}
    </section>
    {selected && <section className="surface rounded-3xl p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h2 className="text-xl font-black">Classificação atual</h2>
          <p className="mt-1 text-xs text-muted">Médias parciais podem mudar até todos os administradores avaliarem. Inscrições sem nota aparecem ao final.</p></div>
        <button type="button" className="btn-ghost" disabled={loadingReport} onClick={() => setRevision((n) => n + 1)}><RefreshCw className="size-4"/> Atualizar</button>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2" role="group" aria-label="Quantidade de atletas">
        {([3, 5, 10, "ALL"] as const).map((value) => <button type="button" key={value}
          aria-pressed={limit === value} onClick={() => setLimit(value)}
          className={`rounded-xl border px-4 py-2 text-xs font-black ${limit === value ? "border-cyan bg-cyan/10 text-cyan" : "border-white/15 text-muted"}`}>
          {value === "ALL" ? "Todos" : `Top ${value}`}
        </button>)}
        {report && <span className="ml-auto text-xs text-muted">{visible.length} de {report.totalEntries} inscrições • {report.activeAdministrators} administradores ativos</span>}
      </div>
      {loadingReport ? <div className="mt-8"><LoaderCircle className="size-7 animate-spin text-cyan"/></div> : report && <>
        {visible.length === 0 ? <p className="mt-6 text-sm text-muted">Nenhuma inscrição encontrada nesse filtro.</p> :
          <div className="mt-5 grid gap-4">{visible.map((item, index) => {
            const external = item.externalUrl && /^https?:\/\//i.test(item.externalUrl) ? item.externalUrl : null;
            return <article key={item.entryId} className="rounded-2xl border border-white/10 bg-night/20 p-4 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0"><p className="text-xs font-bold text-cyan">#{index + 1} • Inscrição {item.registrationNumber}</p>
                  <h3 className="mt-1 text-lg font-black">{item.athleteName}</h3>
                  <p className="mt-1 text-xs text-muted">{item.teamName} • {statusLabels[item.reviewStatus] ?? item.reviewStatus}</p>
                </div>
                <div className="text-right"><p className="text-2xl font-black tabular-nums">{item.averageScore == null ? "—" : item.averageScore.toFixed(2)}</p>
                  <p className="text-xs text-muted">Média atual</p>
                  <p className={`mt-2 text-xs font-bold ${item.allAdministratorsScored ? "text-cyan" : "text-amber"}`}>
                    {item.allAdministratorsScored ? "Notas completas" : "Parcial / pendente"} • {item.scoredAdministrators}/{item.activeAdministrators}
                  </p></div>
              </div>
              <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 text-sm sm:grid-cols-3">
                <div><p className="text-xs text-muted">Responsável</p><p className="font-semibold">{item.representativeName}</p></div>
                <div className="min-w-0"><p className="text-xs text-muted">E-mail do responsável</p><p className="break-all font-semibold">{item.representativeEmail || "Não disponível"}</p></div>
                <div><p className="text-xs text-muted">Instagram informado</p><p className="font-semibold">{item.athleteInstagram || "Não informado"}</p></div>
              </div>
              <div className="mt-4">
                {videoUrls[item.entryId] ? <video key={videoUrls[item.entryId]} controls playsInline preload="metadata" className="w-full max-w-xl rounded-xl" src={videoUrls[item.entryId]}/> :
                  item.sourceType === "UPLOAD" && item.mediaStatus === "READY" ?
                    <button className="btn-ghost" disabled={busyVideo !== null} type="button" onClick={() => void watchVideo(item)}>
                      {busyVideo === item.entryId ? <LoaderCircle className="size-4 animate-spin"/> : <PlayCircle className="size-4"/>} Assistir ao vídeo
                    </button> : external ? <a className="btn-ghost inline-flex" target="_blank" rel="noopener noreferrer" href={external}>
                      <ExternalLink className="size-4"/> Abrir vídeo externo</a> :
                    <p className="text-xs text-muted">Vídeo indisponível ou ainda em processamento.</p>}
              </div>
            </article>;
          })}</div>}
      </>}
    </section>}
  </div>;
}
