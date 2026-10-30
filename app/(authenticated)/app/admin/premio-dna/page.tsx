"use client";

import { TeamMark } from "@/components/team-mark";

import type {
  AdminAwardCandidate,
  AdminAwardEdition,
  AdminAwardOverview,
  ImportAwardTeamResult,
  ResetAwardVotingResult,
} from "@/lib/admin-awards-types";
import {
  ClientApiError,
  clientApi,
  formatDate,
} from "@/lib/client-api";
import type {
  CatalogCategory,
  CatalogItem,
  Team,
} from "@/lib/types";
import {
  BarChart3,
  Check,
  ClipboardCheck,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Trophy,
  UserRoundCheck,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Tab = "overview" | "control";

const positions = [
  { value: "GOLEIRO", label: "Goleiro" },
  { value: "FIXO", label: "Fixo" },
  { value: "ALA", label: "Ala" },
  { value: "PIVO", label: "Pivô" },
] as const;

export default function AwardAdminPage() {
  const [editions, setEditions] = useState<AdminAwardEdition[]>([]);
  const [editionId, setEditionId] = useState("");
  const [overview, setOverview] = useState<AdminAwardOverview | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedEdition =
    editions.find((edition) => edition.id === editionId) ?? null;

  async function loadEditionData(
    targetEditionId: string,
    quiet = false,
  ) {
    if (!targetEditionId) return;

    if (!quiet) setRefreshing(true);

    try {
      const nextOverview = await clientApi<AdminAwardOverview>(
        `/api/admin/awards/editions/${targetEditionId}/overview`,
      );

      setOverview(nextOverview);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível carregar a administração da premiação.",
      );
    } finally {
      if (!quiet) setRefreshing(false);
    }
  }

  useEffect(() => {
    let active = true;

    clientApi<AdminAwardEdition[]>("/api/admin/awards/editions")
      .then((result) => {
        if (!active) return;

        setEditions(result);

        const first = result[0];

        if (first) {
          setEditionId(first.id);
          return loadEditionData(first.id, true);
        }
      })
      .catch((err) => {
        if (!active) return;

        if (err instanceof ClientApiError && err.status === 403) {
          setForbidden(true);
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Não foi possível carregar as edições do prêmio.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!editionId || loading) return;

    const timer = window.setTimeout(() => {
      void loadEditionData(editionId);
    }, 0);

    return () => window.clearTimeout(timer);
    // editionId is the only trigger; loadEditionData is intentionally local.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editionId]);

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3500);
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
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
          Sua conta está autenticada, mas não possui a permissão ADMIN necessária
          para operar o Prêmio DNA Futsal.
        </p>
      </section>
    );
  }

  if (!selectedEdition) {
    return (
      <section className="rounded-3xl border border-white/8 bg-panel p-6">
        <h1 className="display-title text-3xl">Prêmio DNA Futsal</h1>
        <p className="mt-3 text-muted">
          Nenhuma edição foi encontrada.
        </p>
      </section>
    );
  }

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "overview", label: "Visão geral" },
    { id: "control", label: "Controle" },
  ];

  return (
    <>
      <header className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-amber">
              <ClipboardCheck className="size-5" />
              Administração
            </div>
            <h1 className="display-title mt-3 text-3xl sm:text-4xl">
              Prêmio DNA Futsal
            </h1>
            <p className="mt-2 text-sm text-muted">
              Credenciamento do júri técnico, inscrições e controle da votação.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/app/admin/premio-dna/juri-tecnico"
              className="btn-primary"
            >
              <UserRoundCheck className="size-4" />
              Júri técnico
            </Link>
            <Link
              href="/app/admin/premio-dna/candidaturas"
              className="btn-ghost"
            >
              <ClipboardCheck className="size-4" />
              Candidaturas
            </Link>

            <Link
              href="/app/admin/premio-dna/pre-votacao"
              className="btn-ghost"
            >
              <Trophy className="size-4" />
              Pré-votação
            </Link>

            <Link
              href="/app/admin/premio-dna/apuracao"
              className="btn-ghost"
            >
              <BarChart3 className="size-4" />
              Auditoria e apuração
            </Link>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => void loadEditionData(editionId)}
              disabled={refreshing}
            >
              <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
              Atualizar
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-end gap-3">
          <label className="grid min-w-64 gap-1.5 text-sm font-bold">
            Edição
            <select
              className="field"
              value={editionId}
              onChange={(event) => setEditionId(event.target.value)}
            >
              {editions.map((edition) => (
                <option key={edition.id} value={edition.id}>
                  {edition.name}
                </option>
              ))}
            </select>
          </label>

          <StatusBadge status={selectedEdition.status} />
        </div>
      </header>

      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-black transition ${
              tab === item.id
                ? "border-cyan/30 bg-cyan/10 text-cyan"
                : "border-white/8 bg-panel text-muted hover:text-ivory"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {notice ? (
        <p className="mb-5 flex items-center gap-2 rounded-xl border border-cyan/15 bg-cyan/7 px-4 py-3 text-sm font-bold text-cyan">
          <Check className="size-4" />
          {notice}
        </p>
      ) : null}

      {error ? (
        <p
          className="mb-5 rounded-xl border border-coral/25 bg-coral/8 px-4 py-3 text-sm text-[#ffb195]"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {tab === "overview" ? (
        <OverviewSection overview={overview} />
      ) : null}

      {tab === "control" ? (
        <div className="grid gap-6">
          <RegistrationControlSection
            edition={selectedEdition}
            onChanged={async (updated) => {
              setEditions((current) =>
                current.map((edition) =>
                  edition.id === updated.id ? updated : edition,
                ),
              );
              await loadEditionData(editionId);
            }}
            setError={setError}
            flash={flash}
          />

          <VotingControlSection
            edition={selectedEdition}
            overview={overview}
            onChanged={async (updated) => {
              setEditions((current) =>
                current.map((edition) =>
                  edition.id === updated.id ? updated : edition,
                ),
              );
              await loadEditionData(editionId);
            }}
            setError={setError}
            flash={flash}
          />
        </div>
      ) : null}
    </>
  );
}

function OverviewSection({
  overview,
}: {
  overview: AdminAwardOverview | null;
}) {
  if (!overview) {
    return (
      <div className="flex min-h-48 items-center justify-center rounded-3xl border border-white/8 bg-panel">
        <LoaderCircle className="size-7 animate-spin text-cyan" />
      </div>
    );
  }

  const cards = [
    { label: "Times com técnico", value: overview.teams },
    { label: "Técnicos", value: overview.coaches },
    { label: "Treinadores cadastrados", value: overview.votersRegistered },
    { label: "Votos registrados", value: overview.ballotsSubmitted },
    { label: "Votos pendentes", value: overview.ballotsPending },
  ];

  return (
    <div className="grid gap-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-white/8 bg-panel p-4"
          >
            <strong className="display-title text-3xl text-ivory">
              {card.value}
            </strong>
            <small className="mt-1 block text-xs font-bold text-muted">
              {card.label}
            </small>
          </div>
        ))}
      </div>

    </div>
  );
}

function ImportSection({
  edition,
  onImported,
  setError,
}: {
  edition: AdminAwardEdition;
  onImported: (result: ImportAwardTeamResult) => Promise<void>;
  setError: (message: string) => void;
}) {
  const [divisions, setDivisions] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [divisionId, setDivisionId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [loading, setLoading] = useState(false);

  const category =
    categories.find((item) => String(item.id) === categoryId) ?? null;

  useEffect(() => {
    clientApi<CatalogItem[]>(
      `/api/catalog/divisions?season=${edition.season}`,
    )
      .then(setDivisions)
      .catch(() => setDivisions([]));
  }, [edition.season]);

  useEffect(() => {
    if (!divisionId) {
      return;
    }

    clientApi<CatalogCategory[]>(
      `/api/catalog/categories?season=${edition.season}&divisionId=${encodeURIComponent(
        divisionId,
      )}`,
    )
      .then(setCategories)
      .catch(() => setCategories([]));
  }, [divisionId, edition.season]);

  useEffect(() => {
    if (!category?.eventId) {
      return;
    }

    clientApi<Team[]>(
      `/api/catalog/teams?eventId=${encodeURIComponent(
        String(category.eventId),
      )}`,
    )
      .then(setTeams)
      .catch(() => setTeams([]));
  }, [category?.eventId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!category || !teamId) return;

    const numericTeamId = Number(teamId);

    if (!Number.isSafeInteger(numericTeamId) || numericTeamId <= 0) {
      setError("O time selecionado não possui um ID numérico válido.");
      return;
    }

    setLoading(true);

    try {
      const result = await clientApi<ImportAwardTeamResult>(
        "/api/admin/awards/candidates/import-team",
        {
          method: "POST",
          body: JSON.stringify({
            editionId: edition.id,
            eventId: category.eventId,
            divisionId: Number(divisionId),
            categoryId: Number(category.id),
            teamId: numericTeamId,
          }),
        },
      );

      await onImported(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível importar este elenco.",
      );
    } finally {
      setLoading(false);
    }
  }

  const locked = edition.status !== "DRAFT";

  return (
    <section className="rounded-3xl border border-white/8 bg-panel p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <Users className="mt-1 size-6 text-cyan" />
        <div>
          <h2 className="text-xl font-black">Importar elenco</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Copia atletas e técnico principal do scraper para o snapshot da
            premiação. Reimportar o mesmo time atualiza os registros existentes.
          </p>
        </div>
      </div>

      {locked ? (
        <p className="mt-5 rounded-xl border border-amber/20 bg-amber/5 px-4 py-3 text-sm text-muted">
          O snapshot está bloqueado porque a edição não está mais em DRAFT.
        </p>
      ) : (
        <form onSubmit={submit} className="mt-6 grid gap-4 md:grid-cols-3">
          <label className="grid gap-1.5 text-sm font-bold">
            Divisão
            <select
              className="field"
              value={divisionId}
              onChange={(event) => {
                setDivisionId(event.target.value);
                setCategoryId("");
                setTeamId("");
                setCategories([]);
                setTeams([]);
              }}
              required
            >
              <option value="">Selecione</option>
              {divisions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5 text-sm font-bold">
            Categoria
            <select
              className="field"
              value={categoryId}
              onChange={(event) => {
                setCategoryId(event.target.value);
                setTeamId("");
                setTeams([]);
              }}
              disabled={!divisionId}
              required
            >
              <option value="">Selecione</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5 text-sm font-bold">
            Time
            <select
              className="field"
              value={teamId}
              onChange={(event) => setTeamId(event.target.value)}
              disabled={!category?.eventId}
              required
            >
              <option value="">Selecione</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>

          <button
            className="btn-primary md:col-span-3 md:justify-self-end"
            disabled={loading}
          >
            {loading ? (
              <LoaderCircle className="size-5 animate-spin" />
            ) : (
              <Users className="size-5" />
            )}
            {loading ? "Importando..." : "Importar time"}
          </button>
        </form>
      )}
    </section>
  );
}

function PositionsSection({
  edition,
  candidates,
  onChanged,
  setError,
  flash,
}: {
  edition: AdminAwardEdition;
  candidates: AdminAwardCandidate[];
  onChanged: () => Promise<void>;
  setError: (message: string) => void;
  flash: (message: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState("");

  const athletes = useMemo(
    () =>
      candidates
        .filter((candidate) => candidate.type === "ATHLETE" && candidate.active)
        .filter((candidate) => {
          const query = search.trim().toLowerCase();
          if (!query) return true;
          return `${candidate.name} ${candidate.teamName}`
            .toLowerCase()
            .includes(query);
        }),
    [candidates, search],
  );

  async function assign(
    candidate: AdminAwardCandidate,
    position: string,
  ) {
    if (!position || edition.status !== "DRAFT") return;

    setSavingId(candidate.id);
    setError("");

    try {
      await clientApi(
        `/api/admin/awards/candidates/${candidate.id}/position`,
        {
          method: "PATCH",
          body: JSON.stringify({ position }),
        },
      );
      flash(`${candidate.name}: posição atualizada.`);
      await onChanged();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível atualizar a posição.",
      );
    } finally {
      setSavingId("");
    }
  }

  return (
    <section className="rounded-3xl border border-white/8 bg-panel p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-black">Classificar atletas</h2>
          <p className="mt-1 text-sm text-muted">
            Atletas sem posição impedem a abertura da votação.
          </p>
        </div>

        <input
          className="field max-w-72"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar atleta ou time"
        />
      </div>

      <div className="mt-5 grid gap-2">
        {athletes.map((candidate) => (
          <div
            key={candidate.id}
            className="grid gap-3 rounded-2xl border border-white/7 bg-night/35 p-4 md:grid-cols-[1fr_14rem] md:items-center"
          >
            <div>
              <strong className="text-sm text-ivory">{candidate.name}</strong>
              <small className="mt-1 flex items-center gap-2 text-xs text-muted">
                <TeamMark size="xs" team={{ id: candidate.teamId, name: candidate.teamName, sourceName: candidate.teamSourceName, logoUrl: candidate.teamLogoUrl }} />
                {candidate.teamName}
              </small>
            </div>

            <select
              className="field"
              value={candidate.positionCode ?? ""}
              onChange={(event) =>
                void assign(candidate, event.target.value)
              }
              disabled={
                edition.status !== "DRAFT" || savingId === candidate.id
              }
            >
              <option value="">Posição pendente</option>
              {positions.map((position) => (
                <option key={position.value} value={position.value}>
                  {position.label}
                </option>
              ))}
            </select>
          </div>
        ))}

        {!athletes.length ? (
          <p className="py-8 text-center text-sm text-muted">
            Nenhum atleta encontrado.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function RegistrationControlSection({
  edition,
  onChanged,
  setError,
  flash,
}: {
  edition: AdminAwardEdition;
  onChanged: (edition: AdminAwardEdition) => Promise<void>;
  setError: (message: string) => void;
  flash: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function changeRegistrationWindow(open: boolean) {
    const confirmed = window.confirm(
      open
        ? "Abrir o período de inscrições agora? Os responsáveis poderão adicionar, remover e substituir candidaturas."
        : "Encerrar o período de inscrições agora? A partir desse momento as inscrições ficarão somente para consulta.",
    );

    if (!confirmed) return;

    setBusy(true);
    setError("");

    try {
      const updated = await clientApi<AdminAwardEdition>(
        `/api/admin/awards/editions/${edition.id}/registrations/${open ? "open" : "close"}`,
        { method: "POST" },
      );

      flash(
        open
          ? "Período de inscrições aberto."
          : "Período de inscrições encerrado.",
      );

      await onChanged(updated);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível alterar o período de inscrições.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-3xl border border-white/8 bg-panel p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {edition.registrationsOpen ? (
              <UserRoundCheck className="size-6 text-cyan" />
            ) : (
              <LockKeyhole className="size-6 text-muted" />
            )}
            <h2 className="text-xl font-black">Período de inscrições</h2>
          </div>

          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Enquanto estiver aberto, o responsável pode adicionar, retirar ou
            substituir qualquer candidatura, inclusive uma já aprovada ou
            reprovada. Alterar uma mídia analisada devolve a candidatura para
            análise.
          </p>
        </div>

        <span
          className={`rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-wider ${
            edition.registrationsOpen
              ? "border-cyan/25 bg-cyan/8 text-cyan"
              : "border-white/10 bg-night/40 text-muted"
          }`}
        >
          {edition.registrationsOpen ? "Inscrições abertas" : "Inscrições fechadas"}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-night/40 p-4">
          <small className="block text-xs font-bold text-muted">Última abertura</small>
          <strong className="mt-1 block text-sm text-ivory">
            {edition.registrationsOpenedAt
              ? formatDate(edition.registrationsOpenedAt, {
                  dateStyle: "short",
                  timeStyle: "short",
                })
              : "Ainda não registrada"}
          </strong>
        </div>

        <div className="rounded-2xl bg-night/40 p-4">
          <small className="block text-xs font-bold text-muted">Último encerramento</small>
          <strong className="mt-1 block text-sm text-ivory">
            {edition.registrationsClosedAt
              ? formatDate(edition.registrationsClosedAt, {
                  dateStyle: "short",
                  timeStyle: "short",
                })
              : "—"}
          </strong>
        </div>
      </div>

      <button
        type="button"
        className={
          edition.registrationsOpen
            ? "btn-ghost mt-5 w-full border-coral/30 text-coral hover:bg-coral/10"
            : "btn-primary mt-5 w-full"
        }
        disabled={busy}
        onClick={() =>
          void changeRegistrationWindow(!edition.registrationsOpen)
        }
      >
        {busy ? (
          <LoaderCircle className="size-5 animate-spin" />
        ) : edition.registrationsOpen ? (
          <XCircle className="size-5" />
        ) : (
          <ShieldCheck className="size-5" />
        )}
        {edition.registrationsOpen
          ? "Encerrar inscrições agora"
          : "Abrir inscrições agora"}
      </button>
    </section>
  );
}

function VotingControlSection({
  edition,
  overview,
  onChanged,
  setError,
  flash,
}: {
  edition: AdminAwardEdition;
  overview: AdminAwardOverview | null;
  onChanged: (edition: AdminAwardEdition) => Promise<void>;
  setError: (message: string) => void;
  flash: (message: string) => void;
}) {
  const [opening, setOpening] = useState(false);
  const [closing, setClosing] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function open(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const opensAt = String(form.get("opensAt") ?? "");
    const closesAt = String(form.get("closesAt") ?? "");

    if (!opensAt || !closesAt) return;

    const confirmed = window.confirm(
      "Abrir a edição habilita a votação usando os times e elencos atuais do catálogo esportivo. Continuar?",
    );

    if (!confirmed) return;

    setOpening(true);
    setError("");

    try {
      const updated = await clientApi<AdminAwardEdition>(
        `/api/admin/awards/editions/${edition.id}/open`,
        {
          method: "POST",
          body: JSON.stringify({
            votingOpensAt: new Date(opensAt).toISOString(),
            votingClosesAt: new Date(closesAt).toISOString(),
          }),
        },
      );

      flash("Janela de votação configurada.");
      await onChanged(updated);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível abrir a votação.",
      );
    } finally {
      setOpening(false);
    }
  }

  async function close() {
    const confirmed = window.confirm(
      "Encerrar a votação agora? Novos votos deixarão de ser aceitos.",
    );

    if (!confirmed) return;

    setClosing(true);
    setError("");

    try {
      const updated = await clientApi<AdminAwardEdition>(
        `/api/admin/awards/editions/${edition.id}/close`,
        { method: "POST" },
      );

      flash("Votação encerrada.");
      await onChanged(updated);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível encerrar a votação.",
      );
    } finally {
      setClosing(false);
    }
  }


  async function resetVoting() {
    const ballotsSubmitted = overview?.ballotsSubmitted ?? 0;

    const confirmed = window.confirm(
      `Atenção: resetar a votação apagará permanentemente ${ballotsSubmitted} cedulas(s) e todos os votos associados desta edição. Os treinadores cadastrados poderão votar novamente. Deseja continuar?`,
    );

    if (!confirmed) return;

    setResetting(true);
    setError("");

    try {
      const result = await clientApi<ResetAwardVotingResult>(
        `/api/admin/awards/editions/${edition.id}/reset-voting`,
        {
          method: "POST",
        },
      );

      flash(
        `Votação resetada: ${result.ballotsDeleted} cédula(s) e ${result.votesDeleted} voto(s) removidos.`,
      );

      await onChanged(result.edition);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível resetar a votação.",
      );
    } finally {
      setResetting(false);
    }
  }
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-3xl border border-white/8 bg-panel p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <Trophy className="size-6 text-amber" />
          <h2 className="text-xl font-black">Estado da edição</h2>
        </div>

        <div className="mt-5">
          <StatusBadge status={edition.status} />
        </div>

        {edition.votingOpensAt ? (
          <p className="mt-4 text-sm text-muted">
            Abertura:{" "}
            <strong className="text-ivory">
              {formatDate(edition.votingOpensAt, {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </strong>
          </p>
        ) : null}

        {edition.votingClosesAt ? (
          <p className="mt-2 text-sm text-muted">
            Encerramento:{" "}
            <strong className="text-ivory">
              {formatDate(edition.votingClosesAt, {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </strong>
          </p>
        ) : null}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-night/40 p-4">
            <strong className="text-2xl font-black text-cyan">
              {overview?.ballotsSubmitted ?? 0}
            </strong>
            <small className="block text-xs text-muted">votos registrados</small>
          </div>
          <div className="rounded-xl bg-night/40 p-4">
            <strong className="text-2xl font-black text-amber">
              {overview?.ballotsPending ?? 0}
            </strong>
            <small className="block text-xs text-muted">votos pendentes</small>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/8 bg-panel p-5 sm:p-6">
        {edition.status === "DRAFT" ? (
          <>
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-6 text-cyan" />
              <h2 className="text-xl font-black">Abrir votação</h2>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Configure o período em que os treinadores credenciados poderão votar.
              Os atletas são carregados automaticamente durante a votação.
            </p>

            <form onSubmit={open} className="mt-5 grid gap-4">
              <label className="grid gap-1.5 text-sm font-bold">
                Início
                <input
                  className="field"
                  type="datetime-local"
                  name="opensAt"
                  required
                />
              </label>

              <label className="grid gap-1.5 text-sm font-bold">
                Fim
                <input
                  className="field"
                  type="datetime-local"
                  name="closesAt"
                  required
                />
              </label>

              <button className="btn-primary" disabled={opening}>
                {opening ? (
                  <LoaderCircle className="size-5 animate-spin" />
                ) : (
                  <Trophy className="size-5" />
                )}
                Abrir votação
              </button>
            </form>
          </>
        ) : edition.status === "OPEN" ? (
          <>
            <div className="flex items-center gap-2">
              <UserRoundCheck className="size-6 text-cyan" />
              <h2 className="text-xl font-black">Votação em andamento</h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Os times e atletas são consultados do catálogo esportivo durante a
              votação. Você pode acompanhar os treinadores credenciados no Júri técnico e os votos na apuração.
            </p>
            <button
              type="button"
              className="btn-ghost mt-6 w-full"
              onClick={() => void close()}
              disabled={closing}
            >
              {closing ? (
                <LoaderCircle className="size-5 animate-spin" />
              ) : (
                <XCircle className="size-5" />
              )}
              Encerrar votação agora
            </button>
            <button
              type="button"
              className="btn-ghost mt-3 w-full border-coral/30 text-coral hover:bg-coral/10"
              onClick={() => void resetVoting()}
              disabled={
                resetting ||
                closing ||
                (overview?.ballotsSubmitted ?? 0) === 0
              }
            >
              {resetting ? (
                <LoaderCircle className="size-5 animate-spin" />
              ) : (
                <RefreshCw className="size-5" />
              )}
              {resetting ? "Resetando..." : "Resetar votação"}
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <LockKeyhole className="size-6 text-muted" />
              <h2 className="text-xl font-black">Edição encerrada</h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              A edição está fechada para novos votos. Os dados permanecem
              disponíveis para consulta e auditoria.
            </p>
                      <button
              type="button"
              className="btn-ghost mt-6 w-full border-coral/30 text-coral hover:bg-coral/10"
              onClick={() => void resetVoting()}
              disabled={resetting}
            >
              {resetting ? (
                <LoaderCircle className="size-5 animate-spin" />
              ) : (
                <RefreshCw className="size-5" />
              )}
              {resetting ? "Reiniciando..." : "Reiniciar votação"}
            </button>
          </>
        )}
      </section>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: AdminAwardEdition["status"];
}) {
  const label =
    status === "DRAFT"
      ? "Rascunho"
      : status === "OPEN"
        ? "Aberta"
        : "Encerrada";

  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-panel px-3 py-1.5 text-xs font-black uppercase tracking-wider text-cyan">
      {label}
    </span>
  );
}
