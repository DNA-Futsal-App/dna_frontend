
"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Download,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
  Trophy,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ClientApiError, clientApi, formatDate } from "@/lib/client-api";
import type { CatalogCategory, CatalogItem } from "@/lib/types";
import type {
  AdminAwardAudit,
  AdminAwardContextResult,
  AdminAwardEdition,
  AdminAwardResults,
} from "@/lib/admin-awards-types";

export default function AwardResultsAdminPage() {
  const [editions, setEditions] = useState<AdminAwardEdition[]>([]);
  const [editionId, setEditionId] = useState("");
  const [audit, setAudit] = useState<AdminAwardAudit | null>(null);
  const [results, setResults] = useState<AdminAwardResults | null>(null);
  const [divisions, setDivisions] = useState<CatalogItem[]>([]);
  const [categoriesByDivision, setCategoriesByDivision] = useState<
    Record<number, CatalogCategory[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState("");

  const selectedEdition =
    editions.find((edition) => edition.id === editionId) ?? null;

  async function loadEditionData(
    targetEdition: AdminAwardEdition,
    quiet = false,
  ) {
    if (!quiet) setRefreshing(true);
    setError("");

    try {
      const nextAudit = await clientApi<AdminAwardAudit>(
        `/api/admin/awards/editions/${targetEdition.id}/audit`,
      );

      setAudit(nextAudit);
      setResults(null);

      if (targetEdition.status === "CLOSED" && nextAudit.integrityOk) {
        const nextResults = await clientApi<AdminAwardResults>(
          `/api/admin/awards/editions/${targetEdition.id}/results`,
        );
        setResults(nextResults);

        const nextDivisions = await clientApi<CatalogItem[]>(
          `/api/catalog/divisions?season=${targetEdition.season}`,
        ).catch(() => []);
        setDivisions(nextDivisions);

        const uniqueDivisionIds = Array.from(
          new Set(nextResults.contexts.map((context) => context.divisionId)),
        );

        const entries = await Promise.all(
          uniqueDivisionIds.map(async (divisionId) => {
            const categories = await clientApi<CatalogCategory[]>(
              `/api/catalog/categories?season=${targetEdition.season}&divisionId=${divisionId}`,
            ).catch(() => []);
            return [divisionId, categories] as const;
          }),
        );

        setCategoriesByDivision(Object.fromEntries(entries));
      } else {
        setDivisions([]);
        setCategoriesByDivision({});
      }
    } catch (err) {
      if (err instanceof ClientApiError && err.status === 403) {
        setForbidden(true);
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Não foi possível carregar a apuração.",
        );
      }
    } finally {
      if (!quiet) setRefreshing(false);
    }
  }

  useEffect(() => {
    let active = true;

    clientApi<AdminAwardEdition[]>("/api/admin/awards/editions")
      .then(async (data) => {
        if (!active) return;
        setEditions(data);

        const first = data[0];
        if (first) {
          setEditionId(first.id);
          await loadEditionData(first, true);
        }
      })
      .catch((err) => {
        if (!active) return;
        if (err instanceof ClientApiError && err.status === 403) {
          setForbidden(true);
        } else {
          setError(
            err instanceof Error
              ? err.message
              : "Não foi possível carregar as edições.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
    // loadEditionData is intentionally local to this screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const contextLabels = useMemo(() => {
    const labels = new Map<string, string>();

    for (const context of results?.contexts ?? []) {
      const division = divisions.find(
        (item) => item.id === context.divisionId,
      );
      const category = categoriesByDivision[context.divisionId]?.find(
        (item) => item.id === context.categoryId,
      );

      labels.set(
        contextKey(context),
        `${division?.name ?? `Divisão ${context.divisionId}`} • ${
          category?.name ?? `Categoria ${context.categoryId}`
        }`,
      );
    }

    return labels;
  }, [categoriesByDivision, divisions, results]);

  function changeEdition(nextId: string) {
    setEditionId(nextId);
    const edition = editions.find((item) => item.id === nextId);
    if (edition) void loadEditionData(edition);
  }

  function exportCsv() {
    if (!results) return;

    const rows: string[][] = [
      [
        "divisao_id",
        "categoria_id",
        "evento_id",
        "premio",
        "posicao",
        "candidato",
        "time",
        "votos",
        "percentual",
      ],
    ];

    for (const context of results.contexts) {
      for (const category of context.categories) {
        for (const candidate of category.candidates) {
          rows.push([
            String(context.divisionId),
            String(context.categoryId),
            String(context.eventId),
            category.label,
            String(candidate.rank),
            candidate.candidateName,
            candidate.teamName,
            String(candidate.votes),
            candidate.percentage.toFixed(2),
          ]);
        }
      }
    }

    const csv = rows
      .map((row) => row.map(csvCell).join(";"))
      .join("\n");

    const blob = new Blob(["\ufeff", csv], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${results.editionName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")}-apuracao.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex min-h-80 items-center justify-center">
        <LoaderCircle className="size-9 animate-spin text-cyan" />
      </div>
    );
  }

  if (forbidden) {
    return (
      <section className="rounded-3xl border border-coral/20 bg-panel p-6 sm:p-8">
        <LockKeyhole className="size-10 text-coral" />
        <h1 className="display-title mt-4 text-3xl">Acesso administrativo</h1>
        <p className="mt-3 text-sm text-muted">
          Esta área exige uma conta com permissão ADMIN.
        </p>
      </section>
    );
  }

  if (!selectedEdition) {
    return (
      <section className="rounded-3xl border border-white/8 bg-panel p-6">
        Nenhuma edição encontrada.
      </section>
    );
  }

  return (
    <>
      <header className="mb-7">
        <Link
          href="/app/admin/premio-dna"
          className="inline-flex items-center gap-2 text-sm font-black text-cyan hover:text-white"
        >
          <ArrowLeft className="size-4" />
          Voltar à operação
        </Link>

        <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-amber">
              <BarChart3 className="size-5" />
              Auditoria e apuração
            </div>
            <h1 className="display-title mt-3 text-3xl sm:text-4xl">
              Resultados do Prêmio DNA Futsal
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
              Validação estrutural das cédulas e resultado agregado. Nenhuma
              escolha individual de treinador é exibida nesta tela.
            </p>
          </div>

          <button
            type="button"
            className="btn-ghost"
            disabled={refreshing}
            onClick={() => void loadEditionData(selectedEdition)}
          >
            <RefreshCw
              className={`size-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Atualizar
          </button>
        </div>

        <div className="mt-5 flex flex-wrap items-end gap-3">
          <label className="grid min-w-64 gap-1.5 text-sm font-bold">
            Edição
            <select
              className="field"
              value={editionId}
              onChange={(event) => changeEdition(event.target.value)}
            >
              {editions.map((edition) => (
                <option key={edition.id} value={edition.id}>
                  {edition.name}
                </option>
              ))}
            </select>
          </label>
          <EditionState status={selectedEdition.status} />
        </div>
      </header>

      {error ? (
        <p className="mb-5 rounded-xl border border-coral/25 bg-coral/8 px-4 py-3 text-sm text-[#ffb195]">
          {error}
        </p>
      ) : null}

      {audit ? <AuditSummary audit={audit} /> : null}

      {audit?.issues.length ? (
        <section className="mt-6 rounded-3xl border border-coral/20 bg-panel p-5 sm:p-6">
          <div className="flex items-center gap-2 text-coral">
            <TriangleAlert className="size-5" />
            <h2 className="font-black">Inconsistências encontradas</h2>
          </div>
          <div className="mt-4 grid gap-2">
            {audit.issues.map((issue, index) => (
              <div
                key={`${issue.ballotId ?? "global"}-${issue.code}-${index}`}
                className="rounded-xl bg-night/45 px-4 py-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-sm text-coral">{issue.code}</strong>
                  {issue.ballotId ? (
                    <code className="text-[11px] text-muted">
                      cédula {issue.ballotId}
                    </code>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-muted">{issue.detail}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {selectedEdition.status !== "CLOSED" ? (
        <section className="mt-6 rounded-3xl border border-amber/20 bg-amber/5 p-6">
          <div className="flex items-start gap-3">
            <LockKeyhole className="mt-0.5 size-6 shrink-0 text-amber" />
            <div>
              <h2 className="font-black text-ivory">Ranking bloqueado</h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
                Enquanto a edição estiver em {selectedEdition.status}, nenhum
                endpoint retorna votos por candidato. Você pode acompanhar a
                integridade e a quantidade total de cédulas, mas não o placar
                parcial.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {selectedEdition.status === "CLOSED" && audit && !audit.integrityOk ? (
        <section className="mt-6 rounded-3xl border border-coral/20 bg-coral/5 p-6">
          <h2 className="font-black text-coral">Apuração bloqueada</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Corrija ou investigue as inconsistências acima antes de considerar
            o resultado oficial. O backend não libera a agregação enquanto a
            auditoria estiver falhando.
          </p>
        </section>
      ) : null}

      {results ? (
        <section className="mt-7">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.14em] text-cyan">
                <ShieldCheck className="size-5" />
                Auditoria aprovada
              </div>
              <h2 className="display-title mt-2 text-3xl">Apuração final</h2>
              <p className="mt-2 text-sm text-muted">
                {results.ballotsSubmitted} cédulas • {results.voteRows} votos
                registrados
                {results.votingClosedAt
                  ? ` • encerrado em ${formatDate(results.votingClosedAt, {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}`
                  : ""}
              </p>
            </div>

            <button type="button" className="btn-ghost" onClick={exportCsv}>
              <Download className="size-4" />
              Exportar CSV
            </button>
          </div>

          <div className="grid gap-7">
            {results.contexts.map((context) => (
              <ContextResults
                key={contextKey(context)}
                context={context}
                label={
                  contextLabels.get(contextKey(context)) ??
                  `Divisão ${context.divisionId} • Categoria ${context.categoryId}`
                }
              />
            ))}
          </div>

          <p className="mt-7 flex gap-2 rounded-2xl border border-white/8 bg-panel px-4 py-4 text-xs leading-relaxed text-muted">
            <LockKeyhole className="size-4 shrink-0 text-cyan" />
            Estes resultados continuam restritos à área administrativa. Esta
            fase não cria endpoint público nem libera vencedores para os
            treinadores.
          </p>
        </section>
      ) : null}
    </>
  );
}

function AuditSummary({ audit }: { audit: AdminAwardAudit }) {
  const cards = [
    { label: "Cédulas", value: audit.ballotsSubmitted },
    { label: "Linhas de voto", value: audit.voteRows },
    { label: "Cédulas íntegras", value: audit.completeBallots },
    { label: "Com problema", value: audit.invalidBallots },
  ];

  return (
    <section>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-white/8 bg-panel p-5"
          >
            <small className="font-black uppercase tracking-wider text-muted">
              {card.label}
            </small>
            <strong className="display-title mt-2 block text-3xl text-ivory">
              {card.value}
            </strong>
          </div>
        ))}
      </div>

      <div
        className={`mt-4 flex items-start gap-3 rounded-2xl border p-4 ${
          audit.integrityOk
            ? "border-cyan/20 bg-cyan/5"
            : "border-coral/20 bg-coral/5"
        }`}
      >
        {audit.integrityOk ? (
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-cyan" />
        ) : (
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-coral" />
        )}
        <div>
          <strong className="text-sm text-ivory">
            {audit.integrityOk
              ? "Integridade estrutural aprovada"
              : "A auditoria encontrou inconsistências"}
          </strong>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {audit.requiredCategories} categorias obrigatórias são verificadas
            em cada cédula, além de contexto esportivo, tipo do candidato,
            posição e regra de auto-voto do treinador.
          </p>
        </div>
      </div>
    </section>
  );
}

function ContextResults({
  context,
  label,
}: {
  context: AdminAwardContextResult;
  label: string;
}) {
  return (
    <article className="rounded-3xl border border-white/8 bg-panel p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <small className="font-black uppercase tracking-wider text-amber">
            Contexto esportivo
          </small>
          <h3 className="mt-1 text-xl font-black text-ivory">{label}</h3>
          <p className="mt-1 text-xs text-muted">Evento {context.eventId}</p>
        </div>
        <span className="rounded-full border border-white/8 px-3 py-1 text-xs font-black text-muted">
          {context.ballotsSubmitted} cédulas
        </span>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        {context.categories.map((category) => (
          <div
            key={category.voteCategoryId}
            className="overflow-hidden rounded-2xl border border-white/8 bg-night/35"
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/7 px-4 py-3">
              <div className="flex items-center gap-2">
                <Trophy className="size-4 text-amber" />
                <strong>{category.label}</strong>
              </div>
              <small className="font-bold text-muted">
                {category.totalVotes} votos
              </small>
            </div>

            <div className="divide-y divide-white/6">
              {category.candidates.map((candidate) => (
                <div
                  key={candidate.candidateId}
                  className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 px-4 py-3"
                >
                  <span
                    className={`inline-flex size-8 items-center justify-center rounded-full text-sm font-black ${
                      candidate.rank === 1 && candidate.votes > 0
                        ? "bg-amber/15 text-amber"
                        : "bg-white/5 text-muted"
                    }`}
                  >
                    {candidate.rank}º
                  </span>
                  <div className="min-w-0">
                    <strong className="block truncate text-sm text-ivory">
                      {candidate.candidateName}
                    </strong>
                    <small className="block truncate text-muted">
                      {candidate.teamName}
                    </small>
                  </div>
                  <div className="text-right">
                    <strong className="block text-sm text-cyan">
                      {candidate.votes}
                    </strong>
                    <small className="text-muted">
                      {candidate.percentage.toFixed(2)}%
                    </small>
                  </div>
                </div>
              ))}

              {!category.candidates.length ? (
                <p className="px-4 py-5 text-sm text-muted">
                  Nenhum candidato elegível neste contexto.
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function EditionState({ status }: { status: AdminAwardEdition["status"] }) {
  const label =
    status === "DRAFT"
      ? "Rascunho"
      : status === "OPEN"
        ? "Em votação"
        : "Encerrada";

  return (
    <span className="rounded-full border border-white/10 bg-panel px-4 py-2 text-xs font-black uppercase tracking-wider text-muted">
      {label}
    </span>
  );
}

function contextKey(context: {
  eventId: number;
  divisionId: number;
  categoryId: number;
}) {
  return `${context.eventId}:${context.divisionId}:${context.categoryId}`;
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}
