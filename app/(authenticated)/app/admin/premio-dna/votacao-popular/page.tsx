/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarClock, CheckCircle2, CircleAlert, LoaderCircle, ShieldCheck, Users, Video } from "lucide-react";
import { clientApi } from "@/lib/client-api";
import type { AdminAwardEdition } from "@/lib/admin-awards-types";
import {
  votingContextKey, votingContextUrl, votingDate, votingParams, votingStatusLabel,
} from "@/lib/popular-voting-types";
import type { ContextWindow, VotingContext, VotingReadiness } from "@/lib/popular-voting-types";
import { AdminBatchScheduler } from "@/components/popular-voting/admin-batch-scheduler";
import { AdminPopularResults } from "@/components/popular-voting/admin-popular-results";

const reason: Record<string, string> = {
  INSCRICOES_ABERTAS: "As inscrições desta edição ainda estão abertas.",
  REVISOES_PENDENTES: "Existem vídeos aguardando aprovação ou rejeição.",
  MENOS_DE_TRES_VIDEOS_APROVADOS: "São necessários pelo menos três vídeos aprovados e prontos.",
  MENOS_DE_QUATRO_VIDEOS_APROVADOS: "Esta disputa excepcional exige pelo menos quatro vídeos aprovados e prontos.",
  EXCECAO_SEM_EMPATE_NO_CORTE: "A exceção de quatro finalistas exige empate entre o terceiro e o quarto colocados.",
  EMPATE_COM_MAIS_DE_QUATRO: "Há empate também com o quinto colocado. A exceção comporta apenas quatro finalistas.",
  NENHUM_ADMIN_ATIVO: "Não há administradores ativos para compor o júri.",
  NOTAS_PENDENTES: "Há administradores com notas pendentes. Confira os nomes e os vídeos abaixo.",
  EMPATE_NO_CORTE_TOP3: "Existe empate entre o terceiro e o quarto colocados.",
};

type Field = "eventId" | "divisionId" | "categoryId" | "gender" | "contestCategory";
const fields: Field[] = ["eventId", "divisionId", "categoryId", "gender", "contestCategory"];

export default function AdminPopularVotingPage() {
  const [editions, setEditions] = useState<AdminAwardEdition[]>([]);
  const [editionId, setEditionId] = useState("");
  const [contexts, setContexts] = useState<VotingContext[]>([]);
  const [selected, setSelected] = useState<VotingContext | null>(null);
  const [readiness, setReadiness] = useState<VotingReadiness | null>(null);
  const [windowData, setWindowData] = useState<ContextWindow | null>(null);
  const [opensAt, setOpensAt] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingGroup, setLoadingGroup] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    clientApi<AdminAwardEdition[]>("/api/admin/awards/editions")
      .then((value) => { if (active) { setEditions(value); setEditionId(value[0]?.id ?? ""); } })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : "Não foi possível carregar as edições."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!editionId) return;
    let active = true;
    setContexts([]);
    setSelected(null);
    setReadiness(null);
    setWindowData(null);
    clientApi<VotingContext[]>(`/api/admin/awards/editions/${editionId}/popular-voting/contexts`)
      .then((value) => { if (active) { setContexts(value); setSelected(value[0] ?? null); } })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : "Erro ao carregar categorias aprovadas."); });
    return () => { active = false; };
  }, [editionId]);

  const key = selected ? votingContextKey(selected) : "";
  useEffect(() => {
    if (!selected || !editionId) return;
    let active = true;
    setLoadingGroup(true);
    setReadiness(null);
    setWindowData(null);
    setError("");
    setNotice("");
    const params = votingParams(selected);
    void Promise.all([
      clientApi<VotingReadiness>(`/api/admin/awards/editions/${editionId}/popular-voting/readiness?${params}`),
      clientApi<ContextWindow>(`/api/admin/awards/editions/${editionId}/popular-voting/window?${params}`),
    ]).then(([ready, window]) => { if (active) { setReadiness(ready); setWindowData(window); } })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : "Erro na verificação dos jurados."); })
      .finally(() => { if (active) setLoadingGroup(false); });
    return () => { active = false; };
    // O grupo é identificado por cinco chaves estáveis.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editionId, key]);

  function choose(field: Field, raw: string) {
    if (!selected) return;
    const index = fields.indexOf(field);
    const value = index < 3 ? Number(raw) : raw;
    const found = contexts.find((item) => item[field] === value && fields.slice(0, index)
      .every((previous) => item[previous] === selected[previous]));
    if (found) setSelected(found);
  }
  function options(field: Field) {
    if (!selected) return [];
    const index = fields.indexOf(field);
    return Array.from(new Map(contexts.filter((item) => fields.slice(0, index)
      .every((previous) => item[previous] === selected[previous]))
      .map((item) => [String(item[field]), item])).values());
  }
  async function reload() {
    if (!selected) return;
    const params = votingParams(selected);
    const [ready, window] = await Promise.all([
      clientApi<VotingReadiness>(`/api/admin/awards/editions/${editionId}/popular-voting/readiness?${params}`),
      clientApi<ContextWindow>(`/api/admin/awards/editions/${editionId}/popular-voting/window?${params}`),
    ]);
    setReadiness(ready);
    setWindowData(window);
  }
  async function schedule() {
    if (!selected || !opensAt || !closesAt) return;
    const opening = new Date(opensAt);
    const closing = new Date(closesAt);
    if (!Number.isFinite(opening.getTime()) || !Number.isFinite(closing.getTime())
      || opening.getTime() <= Date.now() || closing.getTime() <= opening.getTime()) {
      setError("A abertura deve ser futura e o encerramento deve vir depois dela."); return;
    }
    if (!window.confirm("Confirmar o Top 3 e agendar a votação exclusivamente para este grupo?")) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await clientApi(`/api/admin/awards/editions/${editionId}/popular-voting/window`, {
        method: "POST", body: JSON.stringify({ context: {
          eventId: selected.eventId, divisionId: selected.divisionId, categoryId: selected.categoryId,
          gender: selected.gender, contestCategory: selected.contestCategory,
        }, opensAt: opening.toISOString(), closesAt: closing.toISOString() }),
      });
      await reload();
      setNotice("Finalistas confirmados e votação deste grupo programada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível programar.");
      // A API fornece novamente o relatório completo após qualquer rejeição de agendamento.
      try { await reload(); } catch { /* preservar o erro original */ }
    } finally { setBusy(false); }
  }
  async function close() {
    if (!selected || !window.confirm("Encerrar definitivamente a votação desta categoria?")) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await clientApi(`/api/admin/awards/editions/${editionId}/popular-voting/close`, {
        method: "POST", body: JSON.stringify({
          eventId: selected.eventId, divisionId: selected.divisionId, categoryId: selected.categoryId,
          gender: selected.gender, contestCategory: selected.contestCategory,
        }),
      });
      await reload();
      setNotice("Votação encerrada somente neste grupo.");
    } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível encerrar."); }
    finally { setBusy(false); }
  }

  return <div className="mx-auto max-w-6xl space-y-6">
    <Link href="/app/admin/premio-dna" className="text-sm font-bold text-muted">Voltar ao painel do prêmio</Link>
    <header><p className="eyebrow"><ShieldCheck className="size-4"/> Administração</p>
      <h1 className="display-title mt-3 text-3xl">Votação popular por categoria</h1>
      <p className="mt-3 max-w-3xl text-sm text-muted">Cada modalidade possui datas independentes. O agendamento só é liberado após todos os administradores ativos avaliarem todos os vídeos aprovados daquela disputa.</p>
    </header>
    {error && <p role="alert" className="rounded-2xl border border-coral/30 p-4 text-sm text-coral">{error}</p>}
    {notice && <p role="status" className="rounded-2xl border border-cyan/30 p-4 text-sm text-cyan">{notice}</p>}
    <section className="surface rounded-3xl p-5 sm:p-7">
      {loading ? <LoaderCircle className="size-7 animate-spin text-cyan"/> : <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <label className="grid gap-2 text-sm font-bold">Edição<select className="field" value={editionId} disabled={busy} onChange={(e) => setEditionId(e.target.value)}>{editions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        {selected && <>
          <label className="grid gap-2 text-sm font-bold">Campeonato<select className="field" value={selected.eventId} disabled={busy} onChange={(e) => choose("eventId", e.target.value)}>{options("eventId").map((item) => <option key={item.eventId} value={item.eventId}>Evento #{item.eventId}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">Divisão<select className="field" value={selected.divisionId} disabled={busy} onChange={(e) => choose("divisionId", e.target.value)}>{options("divisionId").map((item) => <option key={item.divisionId} value={item.divisionId}>{item.divisionName}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">Categoria<select className="field" value={selected.categoryId} disabled={busy} onChange={(e) => choose("categoryId", e.target.value)}>{options("categoryId").map((item) => <option key={item.categoryId} value={item.categoryId}>{item.categoryName}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">Gênero<select className="field" value={selected.gender} disabled={busy} onChange={(e) => choose("gender", e.target.value)}>{options("gender").map((item) => <option key={item.gender} value={item.gender}>{item.gender === "MALE" ? "Masculino" : "Feminino"}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">Categoria do prêmio<select className="field" value={selected.contestCategory} disabled={busy} onChange={(e) => choose("contestCategory", e.target.value)}>{options("contestCategory").map((item) => <option key={item.contestCategory} value={item.contestCategory}>{item.contestCategoryLabel}</option>)}</select></label>
        </>}
      </div>}
      {!loading && !selected && <p className="mt-5 text-sm text-muted">Nenhuma categoria com vídeos aprovados nesta edição.</p>}
    </section>
    {!loading && editionId && contexts.length > 0 && <AdminBatchScheduler
      editionId={editionId} contexts={contexts} onScheduled={() => void reload()}/>}
    <h2 className="mt-6 text-lg font-black">Controle individual por modalidade</h2>
    {loadingGroup && <LoaderCircle className="size-7 animate-spin text-cyan"/>}
    {selected && !loadingGroup && readiness && windowData && <>
      <section className="surface rounded-3xl p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3"><div>
          <h2 className="text-xl font-black">Situação desta disputa</h2>
          <p className="mt-2 text-xs text-muted">{readiness.approvedVideos} vídeos aprovados • {readiness.activeAdministrators} administradores ativos • {readiness.pendingReview} revisões pendentes</p>
        </div><span className="rounded-full border border-white/15 px-3 py-2 text-xs font-bold">{votingStatusLabel(windowData.status)}</span></div>
        {readiness.ready ? <p className="mt-5 flex items-center gap-2 text-sm text-cyan"><CheckCircle2 className="size-5"/> Todos os administradores avaliaram todos os vídeos. {readiness.finalistsConfirmed ? "Top 3 confirmado." : "O Top 3 será consolidado ao agendar."}</p> :
          <div className="mt-5 space-y-3">{readiness.blockers.map((blocker) => <p key={blocker} className="flex items-start gap-2 text-sm text-amber"><CircleAlert className="mt-0.5 size-4 shrink-0"/>{reason[blocker] ?? blocker}</p>)}</div>}
        {readiness.missingAdmins.length > 0 && <section className="mt-6">
          <h3 className="flex items-center gap-2 text-base font-black"><Users className="size-5"/> Administradores com avaliações pendentes</h3>
          <p className="mt-1 text-xs text-muted">Abaixo estão todos os administradores ativos que ainda não avaliaram algum vídeo desta disputa.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">{readiness.missingAdmins.map((admin) =>
            <article key={admin.adminId} className="rounded-2xl border border-amber/20 p-4">
              <h4 className="font-black">{admin.adminName}</h4><p className="mt-1 text-xs text-muted">{admin.adminEmail}</p>
              <p className="mt-3 text-xs font-bold text-amber">{admin.missingVideos.length} nota(s) pendente(s)</p>
              <ul className="mt-2 space-y-2">{admin.missingVideos.map((video) => <li key={video.entryId} className="flex items-start gap-2 text-xs text-muted"><Video className="mt-0.5 size-4 shrink-0"/> {video.athleteName} • Inscrição #{video.registrationNumber}</li>)}</ul>
            </article>)}</div>
        </section>}
      </section>
      <section className="surface space-y-5 rounded-3xl p-6 sm:p-8">
        <h2 className="flex items-center gap-2 text-xl font-black"><CalendarClock className="size-5 text-cyan"/> Calendário independente</h2>
        {windowData.status === "NOT_SCHEDULED" ? <>
          <p className="text-xs text-muted">Os horários são interpretados no fuso do seu dispositivo e convertidos para UTC. O agendamento não altera outras disputas.</p>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold">Início<input className="field" type="datetime-local" value={opensAt} disabled={busy} onChange={(e) => setOpensAt(e.target.value)}/></label>
            <label className="grid gap-2 text-sm font-bold">Encerramento<input className="field" type="datetime-local" value={closesAt} disabled={busy} onChange={(e) => setClosesAt(e.target.value)}/></label>
          </div>
          <button className="btn-primary" type="button" disabled={busy || !opensAt || !closesAt} onClick={() => void schedule()}>
            {busy ? <LoaderCircle className="size-4 animate-spin"/> : <CalendarClock className="size-4"/>} Validar e programar esta categoria
          </button>
          <p className="text-xs text-muted">Se houver notas pendentes, a solicitação será recusada e a lista de pendências atualizada.</p>
        </> : <>
          <p className="text-sm text-muted">Abertura: {votingDate(windowData.opensAt)} • Encerramento: {votingDate(windowData.closesAt)} (Brasília)</p>
          {windowData.status === "OPEN" && <button className="btn-ghost" type="button" disabled={busy} onClick={() => void close()}>Encerrar somente esta votação</button>}
          <Link target="_blank" href={votingContextUrl(editionId, selected)} className="btn-ghost inline-flex">Abrir página pública exclusiva</Link>
        </>}
      </section>
      {windowData.status === "CLOSED" && <AdminPopularResults
        key={`${editionId}|${votingContextKey(selected)}`} editionId={editionId} context={selected}/>}
    </>}
  </div>;
}
