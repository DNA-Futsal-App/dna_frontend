"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";

import { clientApi, formatDate } from "@/lib/client-api";
import {
  votingContextKey,
  votingDate,
  votingParams,
  votingStatusLabel,
} from "@/lib/popular-voting-types";
import type {
  ContestCategory,
  Gender,
  VotingBoard,
  VotingContext,
  VotingStatus,
} from "@/lib/popular-voting-types";

type Props = { editionId: string };
type Snapshot = { key: string; board: VotingBoard; receivedAt: string };

type CategoryOption = {
  key: string;
  label: string;
};

const number = (value: number) => value.toLocaleString("pt-BR");
const contextRank: Record<VotingStatus, number> = {
  OPEN: 0,
  CLOSED: 1,
  SCHEDULED: 2,
  NOT_SCHEDULED: 3,
};

function categoryKey(item: VotingContext): string {
  return `${item.eventId}|${item.divisionId}|${item.categoryId}`;
}

function genderLabel(gender: Gender): string {
  return gender === "FEMALE" ? "Feminino" : "Masculino";
}

function percentage(votes: number, total: number): number {
  return total > 0 ? (100 * votes) / total : 0;
}

export function AdminPopularAuditDashboard({ editionId }: Props) {
  const [contexts, setContexts] = useState<VotingContext[]>([]);
  const [loadingContexts, setLoadingContexts] = useState(true);
  const [contextsError, setContextsError] = useState("");
  const [contextsUpdatedAt, setContextsUpdatedAt] = useState("");

  const [divisionFilter, setDivisionFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState<Gender | "">("");
  const [contestFilter, setContestFilter] = useState<ContestCategory | "">("");
  const [statusFilter, setStatusFilter] = useState<VotingStatus | "">("");
  const [selectedKey, setSelectedKey] = useState("");

  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [resultsError, setResultsError] = useState<{ key: string; message: string } | null>(null);
  const [revision, setRevision] = useState(0);

  // Atualiza os estados das disputas, inclusive a passagem de OPEN para CLOSED.
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    let pending = false;

    async function loadContexts() {
      if (pending) return;
      pending = true;
      try {
        const rows = await clientApi<VotingContext[]>(
          `/api/admin/awards/editions/${editionId}/popular-voting/contexts`,
          { signal: controller.signal, cache: "no-store" },
        );
        if (active) {
          setContexts(rows.filter((row) => row.status !== "NOT_SCHEDULED"));
          setContextsUpdatedAt(new Date().toISOString());
          setContextsError("");
        }
      } catch (error) {
        if (active) {
          setContextsError(error instanceof Error ? error.message : "Não foi possível consultar as disputas.");
        }
      } finally {
        pending = false;
        if (active) setLoadingContexts(false);
      }
    }

    void loadContexts();
    const interval = window.setInterval(() => void loadContexts(), 30_000);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(interval);
    };
  }, [editionId]);

  const orderedContexts = useMemo(() => [...contexts].sort((a, b) =>
    contextRank[a.status] - contextRank[b.status]
    || a.divisionName.localeCompare(b.divisionName, "pt-BR")
    || a.categoryName.localeCompare(b.categoryName, "pt-BR")
    || a.contestCategoryLabel.localeCompare(b.contestCategoryLabel, "pt-BR"),
  ), [contexts]);

  const divisions = useMemo(() => [...new Map(orderedContexts.map((row) => [
    String(row.divisionId), row.divisionName,
  ])).entries()], [orderedContexts]);

  const categories = useMemo<CategoryOption[]>(() => {
    const options = new Map<string, CategoryOption>();
    for (const row of orderedContexts) {
      if (divisionFilter && String(row.divisionId) !== divisionFilter) continue;
      if (genderFilter && row.gender !== genderFilter) continue;
      const key = categoryKey(row);
      options.set(key, {
        key,
        label: `${row.categoryName} · Campeonato #${row.eventId}`,
      });
    }
    return [...options.values()];
  }, [orderedContexts, divisionFilter, genderFilter]);

  const contests = useMemo(() => [...new Map(orderedContexts.map((row) => [
    row.contestCategory, row.contestCategoryLabel,
  ])).entries()], [orderedContexts]);

  const visibleContexts = orderedContexts.filter((row) =>
    (!divisionFilter || String(row.divisionId) === divisionFilter)
    && (!categoryFilter || categoryKey(row) === categoryFilter)
    && (!genderFilter || row.gender === genderFilter)
    && (!contestFilter || row.contestCategory === contestFilter)
    && (!statusFilter || row.status === statusFilter),
  );

  const selected = visibleContexts.find((row) => votingContextKey(row) === selectedKey)
    ?? visibleContexts[0] ?? null;
  const currentKey = selected ? votingContextKey(selected) : "";

  // O backend só entrega votos aos administradores quando a disputa está encerrada.
  useEffect(() => {
    if (!selected || selected.status !== "CLOSED") {
      return;
    }

    const controller = new AbortController();
    let active = true;
    let pending = false;

    async function loadBoard() {
      if (pending) return;
      pending = true;
      try {
        const board = await clientApi<VotingBoard>(
          `/api/admin/awards/editions/${editionId}/popular-voting/results?${votingParams(selected!)}`,
          { signal: controller.signal, cache: "no-store" },
        );
        if (active) {
          setSnapshot({ key: currentKey, board, receivedAt: new Date().toISOString() });
          setResultsError(null);
        }
      } catch (error) {
        if (active) {
          setResultsError({
            key: currentKey,
            message: error instanceof Error ? error.message : "Não foi possível consultar os votos.",
          });
        }
      } finally {
        pending = false;
      }
    }

    void loadBoard();
    return () => {
      active = false;
      controller.abort();
    };
    // O contexto é identificado pela chave e pelo status; não recriar o intervalo a cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editionId, currentKey, selected?.status, revision]);

  const boardData = selected?.status === "CLOSED" && snapshot?.key === currentKey ? snapshot : null;
  const board = boardData?.board ?? null;
  const currentResultsError = resultsError?.key === currentKey ? resultsError.message : "";
  const totalVotes = board?.totalVotes;
  const ranked = [...(board?.finalists ?? [])].sort((a, b) =>
    (b.votes ?? 0) - (a.votes ?? 0),
  );
  const leaderVotes = ranked[0]?.votes ?? 0;
  const tied = leaderVotes > 0 && ranked.filter((row) => row.votes === leaderVotes).length > 1;
  const currentStatus = board?.status ?? selected?.status;

  const summary = {
    open: contexts.filter((row) => row.status === "OPEN").length,
    closed: contexts.filter((row) => row.status === "CLOSED").length,
    scheduled: contexts.filter((row) => row.status === "SCHEDULED").length,
  };

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-3xl border border-white/10 bg-panel">
        <div className="border-b border-white/8 px-5 py-5 sm:px-6">
          <h2 className="flex items-center gap-2 text-xl font-black">
            <BarChart3 className="size-5 text-cyan" /> Votação popular · Prêmio Legacy
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
            Apuração exclusiva dos administradores. A contagem de votos só é disponibilizada após
            o encerramento de cada disputa e não representa, por si só, a homologação do resultado.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-px bg-white/8">
          <div className="bg-panel p-4 sm:p-6">
            <p className="flex items-center gap-2 text-xs font-bold text-muted"><Users className="size-4 text-cyan" /> Em andamento</p>
            <strong className="mt-2 block text-3xl font-black tabular-nums">{number(summary.open)}</strong>
          </div>
          <div className="bg-panel p-4 sm:p-6">
            <p className="flex items-center gap-2 text-xs font-bold text-muted"><CheckCircle2 className="size-4 text-cyan" /> Encerradas</p>
            <strong className="mt-2 block text-3xl font-black tabular-nums">{number(summary.closed)}</strong>
          </div>
          <div className="bg-panel p-4 sm:p-6">
            <p className="flex items-center gap-2 text-xs font-bold text-muted"><CalendarClock className="size-4 text-amber" /> Agendadas</p>
            <strong className="mt-2 block text-3xl font-black tabular-nums">{number(summary.scheduled)}</strong>
          </div>
        </div>
        <p className="border-t border-white/8 px-5 py-3 text-xs text-muted sm:px-6">
          Estados atualizados automaticamente a cada 30 segundos
          {contextsUpdatedAt ? ` · Consulta: ${formatDate(contextsUpdatedAt, { dateStyle: "short", timeStyle: "short" })}` : ""}
        </p>
      </section>

      {contextsError ? (
        <p role="alert" className="rounded-xl border border-coral/30 bg-coral/5 p-4 text-sm text-coral">
          Falha ao atualizar as disputas: {contextsError}
          {contexts.length > 0 ? " · Os dados exibidos podem estar desatualizados." : ""}
        </p>
      ) : null}

      {loadingContexts && contexts.length === 0 ? (
        <p role="status" className="flex items-center gap-2 text-sm text-muted">
          <LoaderCircle className="size-4 animate-spin text-cyan" /> Carregando disputas...
        </p>
      ) : contexts.length === 0 ? (
        <div className="surface rounded-3xl p-7 text-sm text-muted">
          Nenhuma votação popular foi agendada nesta edição.
        </div>
      ) : (
        <>
          <section className="surface space-y-4 rounded-3xl p-5 sm:p-6" aria-label="Filtros da votação popular">
            <h3 className="text-base font-black">Filtrar por categoria e prêmio</h3>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <label className="grid gap-1.5 text-xs font-bold text-muted">
                Divisão
                <select className="field text-sm" value={divisionFilter} onChange={(event) => {
                  setDivisionFilter(event.target.value); setCategoryFilter(""); setSelectedKey("");
                }}>
                  <option value="">Todas</option>
                  {divisions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
              </label>
              <label className="grid gap-1.5 text-xs font-bold text-muted">
                Categoria
                <select className="field text-sm" value={categoryFilter} onChange={(event) => {
                  setCategoryFilter(event.target.value); setSelectedKey("");
                }}>
                  <option value="">Todas</option>
                  {categories.map((row) => <option key={row.key} value={row.key}>{row.label}</option>)}
                </select>
              </label>
              <label className="grid gap-1.5 text-xs font-bold text-muted">
                Gênero
                <select className="field text-sm" value={genderFilter} onChange={(event) => {
                  setGenderFilter(event.target.value as Gender | ""); setCategoryFilter(""); setSelectedKey("");
                }}>
                  <option value="">Ambos</option>
                  <option value="MALE">Masculino</option>
                  <option value="FEMALE">Feminino</option>
                </select>
              </label>
              <label className="grid gap-1.5 text-xs font-bold text-muted">
                Prêmio
                <select className="field text-sm" value={contestFilter} onChange={(event) => {
                  setContestFilter(event.target.value as ContestCategory | ""); setSelectedKey("");
                }}>
                  <option value="">Todos</option>
                  {contests.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
                </select>
              </label>
              <label className="grid gap-1.5 text-xs font-bold text-muted">
                Situação
                <select className="field text-sm" value={statusFilter} onChange={(event) => {
                  setStatusFilter(event.target.value as VotingStatus | ""); setSelectedKey("");
                }}>
                  <option value="">Todas</option>
                  <option value="OPEN">Em andamento</option>
                  <option value="CLOSED">Encerradas</option>
                  <option value="SCHEDULED">Agendadas</option>
                </select>
              </label>
            </div>
            <p className="text-xs text-muted">{visibleContexts.length} disputa(s) encontrada(s)</p>
          </section>

          {visibleContexts.length === 0 ? (
            <div className="surface rounded-2xl p-6 text-sm text-muted">Nenhuma disputa corresponde aos filtros selecionados.</div>
          ) : (
            <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]">
              <section className="surface min-w-0 space-y-3 rounded-3xl p-4" aria-label="Selecionar disputa">
                <h3 className="px-1 text-sm font-black">Disputas da edição</h3>
                <div className="grid max-h-[38rem] gap-2 overflow-y-auto pr-1">
                  {visibleContexts.map((row) => {
                    const key = votingContextKey(row);
                    const active = key === currentKey;
                    return (
                      <button key={key} type="button" aria-pressed={active}
                        className={`rounded-xl border p-3 text-left transition ${active
                          ? "border-cyan/50 bg-cyan/10" : "border-white/10 hover:border-cyan/30"}`}
                        onClick={() => setSelectedKey(key)}>
                        <strong className="block text-sm">{row.divisionName} · {row.categoryName}</strong>
                        <span className="mt-1 block text-xs text-muted">
                          {genderLabel(row.gender)} · Campeonato #{row.eventId}
                        </span>
                        <span className="mt-2 block text-xs font-bold text-ivory">{row.contestCategoryLabel}</span>
                        <span className={`mt-2 inline-block text-xs font-black ${row.status === "OPEN"
                          ? "text-cyan" : row.status === "CLOSED" ? "text-muted" : "text-amber"}`}>
                          {votingStatusLabel(row.status)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="surface min-w-0 space-y-5 rounded-3xl p-5 sm:p-6" aria-live="polite">
                {selected ? (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-muted">
                          {selected.divisionName} · {selected.categoryName} · {genderLabel(selected.gender)}
                        </p>
                        <h3 className="mt-2 flex items-center gap-2 text-xl font-black">
                          <Trophy className="size-5 text-amber" /> {selected.contestCategoryLabel}
                        </h3>
                        <p className="mt-2 text-xs text-muted">Campeonato #{selected.eventId}</p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs font-black ${currentStatus === "OPEN"
                        ? "border-cyan/35 text-cyan" : currentStatus === "CLOSED"
                          ? "border-white/20 text-muted" : "border-amber/30 text-amber"}`}>
                        {currentStatus ? votingStatusLabel(currentStatus) : "—"}
                      </span>
                    </div>
                    <p className="flex items-center gap-2 text-xs text-muted">
                      <Clock3 className="size-4" />
                      {votingDate(selected.opensAt)} até {votingDate(selected.closesAt)} (Brasília)
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                      <div>
                        <p className="text-xs font-bold text-muted">Total de votos nesta disputa</p>
                        <strong className="mt-1 block text-3xl font-black tabular-nums">
                          {typeof totalVotes === "number" ? number(totalVotes) : "—"}
                        </strong>
                      </div>
                      <button type="button" className="btn-ghost text-xs" disabled={selected.status !== "CLOSED"}
                        onClick={() => setRevision((value) => value + 1)}>
                        <RefreshCw className="size-4" /> Atualizar votos
                      </button>
                    </div>

                    {selected.status !== "CLOSED" ? (
                      <p className="rounded-xl border border-amber/20 bg-amber/5 p-4 text-sm text-muted">
                        {selected.status === "OPEN"
                          ? "Votação em andamento. A apuração dos votos ficará disponível aos administradores após o encerramento."
                          : "Esta disputa ainda não começou. A apuração ficará disponível após o encerramento."}
                      </p>
                    ) : (
                      <>
                        {currentResultsError ? (
                          <p role="alert" className="rounded-xl border border-coral/30 bg-coral/5 p-3 text-sm text-coral">
                            Falha ao atualizar os votos: {currentResultsError}
                            {boardData ? " · Exibindo a última contagem recebida." : ""}
                          </p>
                        ) : null}
                        {!boardData && !currentResultsError ? (
                          <p role="status" className="flex items-center gap-2 text-sm text-muted">
                            <LoaderCircle className="size-4 animate-spin text-cyan" /> Consultando os votos...
                          </p>
                        ) : board && typeof totalVotes === "number" ? (
                          <>
                            <p className="flex items-center gap-2 text-sm font-bold text-muted">
                              <ShieldCheck className="size-4 text-cyan" />
                              Contagem encerrada · somente administradores
                            </p>
                            {tied ? (
                              <p className="rounded-xl border border-amber/25 bg-amber/5 p-3 text-sm font-bold text-amber">
                                Empate na liderança: {ranked.filter((row) => row.votes === leaderVotes).length} atletas com {number(leaderVotes)} votos.
                              </p>
                            ) : null}
                            <ol className="grid gap-3">
                              {ranked.map((row, index) => {
                                const count = row.votes ?? 0;
                                const share = percentage(count, totalVotes);
                                return (
                                  <li key={row.entryId} className="rounded-2xl border border-white/10 p-4">
                                    <div className="flex items-start justify-between gap-4">
                                      <div className="min-w-0">
                                        <p className="text-xs font-bold text-muted">{index + 1}º colocado</p>
                                        <strong className="mt-1 block text-base font-black text-ivory">{row.athleteName}</strong>
                                        <p className="mt-1 text-xs text-muted">{row.teamName}</p>
                                      </div>
                                      <div className="shrink-0 text-right tabular-nums">
                                        <strong className="block text-xl font-black text-cyan">{number(count)}</strong>
                                        <span className="text-xs text-muted">{count === 1 ? "voto" : "votos"} · {share.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</span>
                                      </div>
                                    </div>
                                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8" aria-hidden="true">
                                      <div className="h-full rounded-full bg-cyan/75" style={{ width: `${share}%` }} />
                                    </div>
                                  </li>
                                );
                              })}
                            </ol>
                            {boardData ? (
                              <p className="text-xs text-muted">
                                Contagem recebida em {formatDate(boardData.receivedAt, { dateStyle: "short", timeStyle: "short" })}.
                                Resultado sujeito à homologação administrativa.
                              </p>
                            ) : null}
                          </>
                        ) : !currentResultsError ? (
                          <p className="text-sm text-muted">Ainda não há apuração disponível para esta disputa.</p>
                        ) : null}
                      </>
                    )}
                  </>
                ) : null}
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
}
