"use client";

import Link from "next/link";
import {
  ArrowLeft, BarChart3, CheckCircle2, ChevronDown, Download, Filter,
  LoaderCircle, RefreshCw, ShieldCheck, TriangleAlert, Trophy, Users, Vote,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorState } from "@/components/feedback";
import { TeamMark } from "@/components/team-mark";
import { clientApi, formatDate } from "@/lib/client-api";
import { useApiData } from "@/lib/use-api-data";
import {
  awardContextKey, awardResultsCsv, buildAwardRaces, type AwardRace,
} from "@/lib/award-results-dashboard";
import type { CatalogCategory, CatalogItem } from "@/lib/types";
import type {
  AdminAwardAudit, AdminAwardCandidateResult, AdminAwardEdition, AdminAwardResults,
} from "@/lib/admin-awards-types";

type Snapshot = {
  audit: AdminAwardAudit;
  results: AdminAwardResults | null;
  divisions: CatalogItem[];
  categories: Record<number, CatalogCategory[]>;
  updatedAt: string;
};

const number = (value: number) => value.toLocaleString("pt-BR");
const percent = (value: number) => value.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%";

export default function AwardResultsAdminPage() {
  const { data: editions, loading, error, reload } = useApiData<AdminAwardEdition[]>("/api/admin/awards/editions");
  const [editionId, setEditionId] = useState("");
  const edition = editions?.find((item) => item.id === editionId) ?? editions?.[0];

  return (
    <div className="min-w-0">
      <header className="mb-7">
        <Link href="/app/admin/premio-dna" className="inline-flex items-center gap-2 text-sm font-bold text-muted transition hover:text-cyan">
          <ArrowLeft className="size-4" /> Administração do prêmio
        </Link>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-cyan">
              <BarChart3 className="size-4" /> Auditoria e apuração
            </p>
            <h1 className="display-title mt-2 text-3xl sm:text-4xl">O retrato da votação</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
              Acompanhe quem lidera, onde há empates e como os votos se distribuem.
            </p>
          </div>
          {edition ? (
            <label className="grid w-full gap-1.5 text-xs font-bold text-muted sm:w-72">
              Edição do prêmio
              <select className="field text-sm text-ivory" value={edition.id} onChange={(event) => setEditionId(event.target.value)}>
                {editions?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
          ) : null}
        </div>
      </header>
      {loading ? <DashboardLoading /> : error ? <ErrorState message={error} onRetry={reload} /> : edition ? (
        <EditionDashboard key={edition.id} edition={edition} />
      ) : <EmptyState title="Nenhuma edição encontrada" description="Os resultados aparecerão quando houver uma edição do prêmio." />}
    </div>
  );
}

function EditionDashboard({ edition }: { edition: AdminAwardEdition }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const options = { signal: controller.signal, cache: "no-store" as const };
    async function load() {
      try {
        const audit = await clientApi<AdminAwardAudit>(`/api/admin/awards/editions/${edition.id}/audit`, options);
        let results: AdminAwardResults | null = null;
        let divisions: CatalogItem[] = [];
        let categories: Record<number, CatalogCategory[]> = {};
        if (audit.integrityOk) {
          const endpoint = edition.status === "CLOSED" ? "results" : "partial-results";
          results = await clientApi<AdminAwardResults>(`/api/admin/awards/editions/${edition.id}/${endpoint}`, options);
          const ids = [...new Set(results.contexts.map((context) => context.divisionId))];
          const [divisionData, entries] = await Promise.all([
            clientApi<CatalogItem[]>(`/api/catalog/divisions?season=${edition.season}`, options).catch(() => []),
            Promise.all(ids.map(async (id) => [
              id,
              await clientApi<CatalogCategory[]>(`/api/catalog/categories?season=${edition.season}&divisionId=${id}`, options).catch(() => []),
            ] as const)),
          ]);
          divisions = divisionData;
          categories = Object.fromEntries(entries);
        }
        if (!controller.signal.aborted) {
          setSnapshot({ audit, results, divisions, categories, updatedAt: new Date().toISOString() });
        }
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Não foi possível carregar a apuração.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [edition.id, edition.season, edition.status, revision]);

  function refresh() {
    setError("");
    setSnapshot(null);
    setLoading(true);
    setRevision((value) => value + 1);
  }

  if (loading) return <DashboardLoading />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;
  if (!snapshot) return null;

  return <ResultsDashboard snapshot={snapshot} edition={edition} refresh={refresh} />;
}

function ResultsDashboard({ snapshot, edition, refresh }: {
  snapshot: Snapshot;
  edition: AdminAwardEdition;
  refresh: () => void;
}) {
  const { audit, results, divisions, categories, updatedAt } = snapshot;
  const [divisionId, setDivisionId] = useState("");
  const [contextId, setContextId] = useState("");
  const [awardCode, setAwardCode] = useState("");
  const races = useMemo(() => buildAwardRaces(results?.contexts ?? []), [results]);
  const contexts = [...new Map(races.map((race) => [awardContextKey(race.context), race.context])).values()];
  const divisionIds = [...new Set(contexts.map((context) => context.divisionId))];
  const availableContexts = contexts.filter((context) => !divisionId || String(context.divisionId) === divisionId);
  const contextRaces = races.filter((race) =>
    (!divisionId || String(race.context.divisionId) === divisionId) &&
    (!contextId || awardContextKey(race.context) === contextId),
  );
  const awards = [...new Map(contextRaces.map((race) => [race.category.code, race.category.label])).entries()];
  const visibleRaces = contextRaces.filter((race) => !awardCode || race.category.code === awardCode);
  const ties = races.filter((race) => race.leaders.length > 1).length;
  const visibleVotes = visibleRaces.reduce((sum, race) => sum + race.category.totalVotes, 0);
  const hasFilters = Boolean(divisionId || contextId || awardCode);
  const validResults = audit.integrityOk && Boolean(results?.integrityOk);

  function contextLabel(context: AwardRace["context"]) {
    const division = divisions.find((item) => item.id === context.divisionId)?.name ?? `Divisão ${context.divisionId}`;
    const category = categories[context.divisionId]?.find((item) => item.id === context.categoryId)?.name ?? `Categoria ${context.categoryId}`;
    return `${division} · ${category}`;
  }

  const distribution = availableContexts.map((context) => ({
    context,
    votes: visibleRaces.filter((race) => awardContextKey(race.context) === awardContextKey(context))
      .reduce((sum, race) => sum + race.category.totalVotes, 0),
  })).filter((item) => item.votes > 0).sort((a, b) => b.votes - a.votes);
  const filteredTies = visibleRaces.filter((race) => race.leaders.length > 1);
  const closest = visibleRaces.filter((race) => race.lead !== null && race.lead > 0)
    .sort((a, b) => a.lead! - b.lead!)[0];

  function clearFilters() {
    setDivisionId("");
    setContextId("");
    setAwardCode("");
  }

  function exportCsv() {
    const url = URL.createObjectURL(new Blob([awardResultsCsv(visibleRaces)], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${edition.slug || "premio-dna"}-apuracao.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-3xl border border-white/10 bg-panel">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/8 bg-linear-to-r from-cyan/8 to-transparent px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black ${edition.status === "CLOSED" ? "border-cyan/25 bg-cyan/10 text-cyan" : "border-amber/25 bg-amber/10 text-amber"}`}>
              <span className="size-1.5 rounded-full bg-current" />
              {edition.status === "CLOSED" ? "Votação encerrada" : edition.status === "OPEN" ? "Votação em andamento" : "Edição em preparação"}
            </span>
            <span className="text-xs text-muted">
              {edition.status === "CLOSED" ? "Apuração final" : "Resultados parciais · sujeitos a alteração"}
            </span>
          </div>
          <button type="button" className="inline-flex min-h-10 items-center gap-2 text-xs font-bold text-muted hover:text-cyan" onClick={refresh}>
            <RefreshCw className="size-3.5" />
            Atualizar
          </button>
        </div>
        <div className="grid grid-cols-2 gap-px bg-white/8 xl:grid-cols-4">
          <Metric icon={<Vote className="size-4" />} label="Votos registrados" value={results?.voteRows ?? audit.voteRows} detail="Escolhas em todos os prêmios" />
          <Metric icon={<Users className="size-4" />} label="Cédulas recebidas" value={results?.ballotsSubmitted ?? audit.ballotsSubmitted} detail="Uma cédula reúne vários votos" />
          <Metric icon={<Trophy className="size-4" />} label="Disputas com votos" value={validResults ? races.length : null} detail="Prêmios por divisão e categoria" />
          <Metric icon={<BarChart3 className="size-4" />} label="Empates na liderança" value={validResults ? ties : null} detail={validResults && ties === 0 ? "Nenhuma liderança empatada" : "Disputas com líderes empatados"} accent />
        </div>
        <div className="flex flex-wrap justify-between gap-2 border-t border-white/8 px-5 py-3 text-[11px] text-muted sm:px-6">
          <span>Totais da edição · acesso administrativo</span>
          <span>Atualizado em {formatDate(updatedAt, { dateStyle: "short", timeStyle: "short" })}</span>
        </div>
      </section>

      {!validResults ? (
        <section className="flex gap-3 rounded-2xl border border-coral/25 bg-coral/8 p-5" role="alert">
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-coral" />
          <div>
            <h2 className="font-black text-coral">Apuração bloqueada para conferência</h2>
            <p className="mt-1 text-sm text-muted">Há inconsistências na auditoria. Consulte os detalhes abaixo antes de considerar os resultados.</p>
          </div>
        </section>
      ) : !races.length ? (
        <EmptyState title="Aguardando os primeiros votos" description="Os rankings aparecerão assim que houver candidatos com votos nesta edição." />
      ) : (
        <>
          <section aria-label="Filtros dos resultados" className="rounded-2xl border border-white/8 bg-panel p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-sm font-bold"><Filter className="size-4 text-cyan" /> Explorar resultados</h2>
              {hasFilters ? <button className="text-xs font-bold text-cyan hover:underline" type="button" onClick={clearFilters}>Limpar filtros</button> : null}
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <label className="grid min-w-0 gap-1.5 text-xs font-bold text-muted">Divisão
                <select className="field text-sm text-ivory" value={divisionId} onChange={(event) => { setDivisionId(event.target.value); setContextId(""); setAwardCode(""); }}>
                  <option value="">Todas as divisões</option>
                  {divisionIds.map((id) => <option key={id} value={id}>{divisions.find((item) => item.id === id)?.name ?? `Divisão ${id}`}</option>)}
                </select>
              </label>
              <label className="grid min-w-0 gap-1.5 text-xs font-bold text-muted">Categoria
                <select className="field text-sm text-ivory" value={contextId} onChange={(event) => { setContextId(event.target.value); setAwardCode(""); }}>
                  <option value="">Todas as categorias</option>
                  {availableContexts.map((context) => <option key={awardContextKey(context)} value={awardContextKey(context)}>{contextLabel(context)}</option>)}
                </select>
              </label>
              <label className="grid min-w-0 gap-1.5 text-xs font-bold text-muted">Prêmio
                <select className="field text-sm text-ivory" value={awardCode} onChange={(event) => setAwardCode(event.target.value)}>
                  <option value="">Todos os prêmios</option>
                  {awards.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
                </select>
              </label>
            </div>
          </section>

          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
            <section className="min-w-0" aria-label="Rankings da votação">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black">Quem está na frente</h2>
                  <p className="mt-1 text-xs text-muted" role="status">{number(visibleRaces.length)} disputas · {number(visibleVotes)} votos no recorte</p>
                </div>
                <button type="button" className="btn-ghost text-xs" onClick={exportCsv} disabled={!visibleRaces.length}>
                  <Download className="size-4" /> Exportar recorte
                </button>
              </div>
              <div className="grid items-start gap-4 md:grid-cols-2">
                {visibleRaces.map((race) => <RaceCard key={race.key} race={race} label={contextLabel(race.context)} />)}
              </div>
              {!visibleRaces.length ? <EmptyState title="Nenhum voto neste recorte" description="Altere os filtros para consultar os demais resultados." /> : null}
            </section>

            <aside className="grid min-w-0 gap-4">
              <section className="rounded-2xl border border-cyan/15 bg-linear-to-br from-cyan/8 to-panel p-5">
                <p className="text-[10px] font-black uppercase tracking-[.16em] text-cyan">Leitura rápida</p>
                <h2 className="mt-2 text-lg font-black">{filteredTies.length ? `${filteredTies.length} ${filteredTies.length === 1 ? "disputa empatada" : "disputas empatadas"}` : "Lideranças sem empate"}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {filteredTies.length ? "Os cartões sinalizados têm dois ou mais candidatos com a mesma votação na primeira posição." : "Cada disputa exibida tem um candidato isolado na primeira posição."}
                </p>
                {closest ? (
                  <div className="mt-4 border-t border-cyan/15 pt-4">
                    <p className="text-[10px] font-black uppercase tracking-wider text-muted">Menor vantagem no recorte</p>
                    <p className="mt-1 text-2xl font-black text-cyan">{closest.lead} {closest.lead === 1 ? "voto" : "votos"}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted">{closest.category.label} · {contextLabel(closest.context)}</p>
                    <a href={`#race-${closest.key}`} className="mt-3 inline-block text-xs font-bold text-cyan hover:underline">Ver disputa →</a>
                  </div>
                ) : null}
              </section>
              <section className="rounded-2xl border border-white/8 bg-panel p-5">
                <h2 className="font-black">Onde estão os votos</h2>
                <p className="mt-1 text-xs leading-relaxed text-muted">Participação de cada categoria no volume de votos do recorte.</p>
                <div className="mt-5 grid max-h-96 gap-5 overflow-y-auto pr-1">
                  {distribution.map(({ context, votes }) => (
                    <button key={awardContextKey(context)} type="button" className="group text-left" onClick={() => setContextId(awardContextKey(context))} aria-label={`Filtrar ${contextLabel(context)}`}>
                      <span className="flex items-start justify-between gap-3 text-xs">
                        <span className="min-w-0 font-bold text-muted group-hover:text-ivory">{contextLabel(context)}</span>
                        <strong className="shrink-0 text-ivory">{percent(votes / visibleVotes * 100)}</strong>
                      </span>
                      <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-white/6"><span className="block h-full rounded-full bg-cyan/70" style={{ width: `${votes / visibleVotes * 100}%` }} /></span>
                      <span className="mt-1 block text-[10px] text-muted">{number(votes)} votos</span>
                    </button>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </>
      )}
      <AuditDetails audit={audit} />
      {results?.votingClosedAt ? <p className="text-xs text-muted">Votação encerrada em {formatDate(results.votingClosedAt, { dateStyle: "short", timeStyle: "short" })}.</p> : null}
    </div>
  );
}

function Metric({ icon, label, value, detail, accent = false }: {
  icon: React.ReactNode; label: string; value: number | null; detail: string; accent?: boolean;
}) {
  return (
    <div className="min-w-0 bg-panel p-4 sm:p-6">
      <div className="flex items-center gap-2 text-muted"><span className={accent ? "text-amber" : "text-cyan"}>{icon}</span><span className="text-xs font-bold">{label}</span></div>
      <strong className={`mt-3 block text-3xl font-black tabular-nums sm:text-4xl ${accent ? "text-amber" : "text-ivory"}`}>{value === null ? "—" : number(value)}</strong>
      <p className="mt-2 text-[11px] leading-relaxed text-muted">{detail}</p>
    </div>
  );
}

function RaceCard({ race, label }: { race: AwardRace; label: string }) {
  const { category, leaders, lead } = race;
  const tied = leaders.length > 1;
  const shown = Math.max(3, leaders.length);
  const remaining = category.candidates.length - shown;
  return (
    <article id={`race-${race.key}`} className="min-w-0 scroll-mt-6 overflow-hidden rounded-2xl border border-white/10 bg-panel">
      <div className="border-b border-white/8 px-4 py-4 sm:px-5">
        <p className="text-[11px] font-bold text-muted">{label}</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-lg font-black"><Trophy className="size-4 shrink-0 text-amber" />{category.label}</h3>
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${tied ? "bg-amber/12 text-amber" : "bg-cyan/8 text-cyan"}`}>
            {tied ? `Empate · ${leaders.length} líderes` : lead === null ? "Único candidato com votos" : `+${lead} ${lead === 1 ? "voto" : "votos"} de vantagem`}
          </span>
        </div>
      </div>
      <ol className="divide-y divide-white/6">
        {category.candidates.slice(0, shown).map((candidate) => <CandidateRow key={candidate.candidateId} candidate={candidate} leading={candidate.votes === leaders[0].votes} />)}
      </ol>
      {remaining > 0 ? (
        <details className="group border-t border-white/8">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-5 py-3 text-xs font-bold text-cyan [&::-webkit-details-marker]:hidden">
            Ver mais {remaining} {remaining === 1 ? "candidato com votos" : "candidatos com votos"} <ChevronDown className="size-4 transition group-open:rotate-180" />
          </summary>
          <ol start={shown + 1} className="divide-y divide-white/6 border-t border-white/6">
            {category.candidates.slice(shown).map((candidate) => <CandidateRow key={candidate.candidateId} candidate={candidate} leading={false} />)}
          </ol>
        </details>
      ) : null}
      <div className="flex flex-wrap justify-between gap-2 border-t border-white/8 bg-night/30 px-5 py-3 text-[10px] text-muted">
        <span>{number(category.totalVotes)} votos · {category.candidates.length} candidatos votados</span>
        <span>% dos votos deste prêmio</span>
      </div>
    </article>
  );
}

function CandidateRow({ candidate, leading }: { candidate: AdminAwardCandidateResult; leading: boolean }) {
  return (
    <li className={`grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-start gap-2 px-4 py-4 sm:gap-3 sm:px-5 ${leading ? "bg-amber/4" : ""}`}>
      <span className={`pt-0.5 text-xs font-black tabular-nums ${leading ? "text-amber" : "text-muted"}`}>{candidate.rank}º</span>
      <div className="min-w-0">
        <p className="wrap-break-word text-sm font-bold leading-snug text-ivory">{candidate.candidateName}</p>
        <div className="mt-1.5 flex items-center gap-1.5">
          <TeamMark size="xs" team={{ id: candidate.teamId, name: candidate.teamName, sourceName: candidate.teamSourceName, logoUrl: candidate.teamLogoUrl }} />
          <span className="min-w-0 wrap-break-word text-[11px] text-muted">{candidate.teamName}</span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/6" aria-hidden="true">
          <div className={`h-full rounded-full ${leading ? "bg-amber" : "bg-cyan/60"}`} style={{ width: `${Math.min(100, candidate.percentage)}%` }} />
        </div>
      </div>
      <div className="text-right tabular-nums">
        <strong className={`block text-lg font-black leading-none ${leading ? "text-amber" : "text-ivory"}`}>{number(candidate.votes)}</strong>
        <span className="mt-1 block text-[10px] text-muted">{candidate.votes === 1 ? "voto" : "votos"}</span>
        <span className="mt-2 block text-xs font-bold text-muted">{percent(candidate.percentage)}</span>
      </div>
    </li>
  );
}

function AuditDetails({ audit }: { audit: AdminAwardAudit }) {
  return (
    <details open={!audit.integrityOk} className="group rounded-2xl border border-white/8 bg-panel">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-5 [&::-webkit-details-marker]:hidden">
        {audit.integrityOk ? <CheckCircle2 className="size-5 shrink-0 text-cyan" /> : <TriangleAlert className="size-5 shrink-0 text-coral" />}
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">{audit.integrityOk ? "Auditoria aprovada" : "Auditoria requer atenção"}</span>
          <span className="mt-1 block text-xs text-muted">{number(audit.completeBallots)} cédulas íntegras · {number(audit.invalidBallots)} com inconsistências</span>
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted transition group-open:rotate-180" />
      </summary>
      <div className="border-t border-white/8 p-5">
        <p className="flex items-start gap-2 text-xs leading-relaxed text-muted">
          <ShieldCheck className="size-4 shrink-0 text-cyan" />
          Verificação de {audit.requiredCategories} categorias obrigatórias por cédula, contexto esportivo, posição e regras de votação. As escolhas individuais dos treinadores são preservadas.
        </p>
        {audit.issues.length ? <div className="mt-4 grid gap-2">
          {audit.issues.map((issue, index) => <div key={`${issue.ballotId ?? "global"}-${issue.code}-${index}`} className="rounded-xl border border-coral/15 bg-coral/5 p-4">
            <strong className="wrap-break-word text-xs text-coral">{issue.code}</strong>
            {issue.ballotId ? <p className="mt-1 break-all text-[10px] text-muted">Cédula {issue.ballotId}</p> : null}
            <p className="mt-2 text-sm text-muted">{issue.detail}</p>
          </div>)}
        </div> : null}
      </div>
    </details>
  );
}

function DashboardLoading() {
  return <div className="flex min-h-80 items-center justify-center gap-3 text-sm text-muted" role="status"><LoaderCircle className="size-5 animate-spin text-cyan" /> Carregando apuração…</div>;
}
