"use client";

import Link from "next/link";
import {
  BarChart3,
  Check,
  Clipboard,
  ClipboardCheck,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  Send,
  ShieldCheck,
  Trophy,
  UserRoundCheck,
  Users,
  XCircle,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
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
import type {
  AdminAwardCandidate,
  AdminAwardCoach,
  AdminAwardEdition,
  AdminAwardOverview,
  CoachAdminAccessState,
  CreateCoachInviteResult,
  ImportAwardTeamResult,
  SyncAwardCoachesResult,
} from "@/lib/admin-awards-types";

type Tab = "overview" | "coaches" | "control";

const positions = [
  { value: "GOLEIRO", label: "Goleiro" },
  { value: "FIXO", label: "Fixo" },
  { value: "ALA", label: "Ala" },
  { value: "PIVO", label: "Pivô" },
] as const;

const accessLabels: Record<CoachAdminAccessState, string> = {
  NOT_INVITED: "Sem convite",
  INVITED: "Convite enviado",
  RESERVED: "Cadastro iniciado",
  RESERVATION_EXPIRED: "Cadastro expirou",
  REGISTERED: "Cadastrado",
  VOTED: "Votou",
  EXPIRED: "Convite expirado",
  REVOKED: "Convite revogado",
  CLAIMED: "Convite utilizado",
  INACTIVE: "Inativo",
};

export default function AwardAdminPage() {
  const [editions, setEditions] = useState<AdminAwardEdition[]>([]);
  const [editionId, setEditionId] = useState("");
  const [overview, setOverview] = useState<AdminAwardOverview | null>(null);
  const [coaches, setCoaches] = useState<AdminAwardCoach[]>([]);
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
      const [nextOverview, nextCoaches] = await Promise.all([
        clientApi<AdminAwardOverview>(
          `/api/admin/awards/editions/${targetEditionId}/overview`,
        ),
        clientApi<AdminAwardCoach[]>(
          `/api/admin/awards/editions/${targetEditionId}/coaches`,
        ),
      ]);

      setOverview(nextOverview);
      setCoaches(nextCoaches);
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
    { id: "coaches", label: "Treinadores" },
    { id: "control", label: "Votação" },
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
              Snapshot, convites, adesão dos treinadores e controle da votação.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
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

      {tab === "coaches" ? (
        <CoachesSection
          edition={selectedEdition}
          coaches={coaches}
          onChanged={async () => {
            await loadEditionData(editionId);
          }}
          setError={setError}
          flash={flash}
        />
      ) : null}

      {tab === "control" ? (
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
    { label: "Sem convite", value: overview.coachesNotInvited },
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

      <section className="rounded-3xl border border-white/8 bg-panel p-5 sm:p-6">
        <h2 className="text-lg font-black">Funil dos treinadores</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-5">
          <FunnelItem label="Sem convite" value={overview.coachesNotInvited} />
          <FunnelItem label="Convidados" value={overview.coachesInvited} />
          <FunnelItem label="Em cadastro" value={overview.coachesReserved} />
          <FunnelItem label="Cadastrados" value={overview.coachesRegistered} />
          <FunnelItem label="Votaram" value={overview.coachesVoted} />
        </div>
      </section>
    </div>
  );
}

function FunnelItem({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl bg-night/40 px-4 py-4">
      <strong className="text-2xl font-black text-cyan">{value}</strong>
      <small className="mt-1 block text-xs font-bold text-muted">{label}</small>
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
              <small className="mt-1 block text-xs text-muted">
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

function CoachesSection({
  edition,
  coaches,
  onChanged,
  setError,
  flash,
}: {
  edition: AdminAwardEdition;
  coaches: AdminAwardCoach[];
  onChanged: () => Promise<void>;
  setError: (message: string) => void;
  flash: (message: string) => void;
}) {
  const [busyId, setBusyId] = useState("");
  const [generated, setGenerated] = useState<{
    coachName: string;
    url: string;
    expiresAt: string;
  } | null>(null);
  const [divisions, setDivisions] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [divisionId, setDivisionId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [syncing, setSyncing] = useState(false);

  const selectedCategory =
    categories.find((item) => String(item.id) === categoryId) ?? null;

  useEffect(() => {
    setDivisionId("");
    setCategoryId("");
    setCategories([]);

    clientApi<CatalogItem[]>(
      `/api/catalog/divisions?season=${edition.season}`,
    )
      .then(setDivisions)
      .catch(() => setDivisions([]));
  }, [edition.id, edition.season]);

  useEffect(() => {
    if (!divisionId) {
      setCategories([]);
      setCategoryId("");
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

  async function syncCoaches(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedCategory || !divisionId || edition.status !== "DRAFT") return;

    setSyncing(true);
    setError("");

    try {
      const result = await clientApi<SyncAwardCoachesResult>(
        `/api/admin/awards/editions/${edition.id}/coaches/sync`,
        {
          method: "POST",
          body: JSON.stringify({
            eventId: selectedCategory.eventId,
            divisionId: Number(divisionId),
            categoryId: Number(selectedCategory.id),
          }),
        },
      );

      flash(
        `${result.coachesFound} treinador(es) sincronizado(s) em ${result.teamsScanned} time(s).`,
      );
      await onChanged();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível sincronizar os treinadores.",
      );
    } finally {
      setSyncing(false);
    }
  }

  async function generate(coach: AdminAwardCoach) {
    setBusyId(coach.candidateId);
    setError("");

    try {
      const result = await clientApi<CreateCoachInviteResult>(
        "/api/admin/awards/coach-invites",
        {
          method: "POST",
          body: JSON.stringify({
            editionId: edition.id,
            coachCandidateId: coach.candidateId,
          }),
        },
      );

      setGenerated({
        coachName: coach.coachName,
        url: result.inviteUrl,
        expiresAt: result.expiresAt,
      });

      flash(`Convite de ${coach.coachName} gerado.`);
      await onChanged();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível gerar o convite.",
      );
    } finally {
      setBusyId("");
    }
  }

  async function revoke(coach: AdminAwardCoach) {
    if (!coach.inviteId) return;

    const confirmed = window.confirm(
      `Revogar o convite atual de ${coach.coachName}?`,
    );

    if (!confirmed) return;

    setBusyId(coach.candidateId);
    setError("");

    try {
      await clientApi(
        `/api/admin/awards/coach-invites/${coach.inviteId}/revoke`,
        { method: "POST" },
      );
      flash(`Convite de ${coach.coachName} revogado.`);
      await onChanged();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível revogar o convite.",
      );
    } finally {
      setBusyId("");
    }
  }

  async function copyLink() {
    if (!generated) return;

    try {
      await navigator.clipboard.writeText(generated.url);
      flash("Link copiado para a área de transferência.");
    } catch {
      setError(
        "Não foi possível copiar automaticamente. Selecione o link e copie manualmente.",
      );
    }
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-3xl border border-white/8 bg-panel p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <Users className="mt-1 size-6 text-cyan" />
          <div>
            <h2 className="text-xl font-black">Sincronizar treinadores</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Escolha a divisão e a categoria. O sistema percorre todos os times
              desse campeonato e traz somente os técnicos principais para a lista
              de convites. Atletas não precisam ser importados pelo administrador.
            </p>
          </div>
        </div>

        {edition.status !== "DRAFT" ? (
          <p className="mt-5 rounded-xl border border-amber/20 bg-amber/5 px-4 py-3 text-sm text-muted">
            A sincronização de treinadores fica bloqueada depois que a votação é aberta.
          </p>
        ) : (
          <form
            onSubmit={syncCoaches}
            className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end"
          >
            <label className="grid gap-1.5 text-sm font-bold">
              Divisão
              <select
                className="field"
                value={divisionId}
                onChange={(event) => {
                  setDivisionId(event.target.value);
                  setCategoryId("");
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
                onChange={(event) => setCategoryId(event.target.value)}
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

            <button
              className="btn-primary"
              disabled={syncing || !selectedCategory}
            >
              {syncing ? (
                <LoaderCircle className="size-5 animate-spin" />
              ) : (
                <RefreshCw className="size-5" />
              )}
              {syncing ? "Sincronizando..." : "Sincronizar técnicos"}
            </button>
          </form>
        )}
      </section>

      {generated ? (
        <section className="rounded-3xl border border-cyan/20 bg-cyan/6 p-5">
          <div className="flex items-center gap-2 text-cyan">
            <Send className="size-5" />
            <strong>Link gerado para {generated.coachName}</strong>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            Copie agora. Por segurança o backend guarda somente o hash do token
            e este endereço completo não poderá ser recuperado depois.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              className="field min-w-0 flex-1"
              readOnly
              value={generated.url}
              onFocus={(event) => event.currentTarget.select()}
            />
            <button type="button" className="btn-primary" onClick={copyLink}>
              <Clipboard className="size-4" />
              Copiar
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">
            Expira em{" "}
            {formatDate(generated.expiresAt, {
              dateStyle: "short",
              timeStyle: "short",
            })}
          </p>
        </section>
      ) : null}

      <section className="rounded-3xl border border-white/8 bg-panel p-5 sm:p-6">
        <h2 className="text-xl font-black">Treinadores e convites</h2>
        <p className="mt-1 text-sm text-muted">
          Acompanhe convite, cadastro e voto por treinador.
        </p>

        <div className="mt-5 grid gap-3">
          {coaches.map((coach) => {
            const canGenerate = [
              "NOT_INVITED",
              "EXPIRED",
              "REVOKED",
              "RESERVATION_EXPIRED",
            ].includes(coach.accessState);

            const canRevoke =
              Boolean(coach.inviteId) &&
              ["INVITED", "RESERVED"].includes(coach.accessState);

            return (
              <div
                key={coach.candidateId}
                className="rounded-2xl border border-white/7 bg-night/35 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <strong className="text-ivory">{coach.coachName}</strong>
                    <small className="mt-1 block text-xs text-muted">
                      {coach.teamName}
                    </small>
                    {coach.userEmail ? (
                      <small className="mt-1 block text-xs text-cyan">
                        {coach.userName ?? "Conta vinculada"} • {coach.userEmail}
                      </small>
                    ) : null}
                  </div>

                  <AccessBadge state={coach.accessState} />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {canGenerate ? (
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => void generate(coach)}
                      disabled={busyId === coach.candidateId}
                    >
                      {busyId === coach.candidateId ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <Send className="size-4" />
                      )}
                      Gerar convite
                    </button>
                  ) : null}

                  {canRevoke ? (
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => void revoke(coach)}
                      disabled={busyId === coach.candidateId}
                    >
                      <XCircle className="size-4" />
                      Revogar
                    </button>
                  ) : null}

                  {coach.accessState === "INVITED" ? (
                    <span className="self-center text-xs text-muted">
                      O link completo não é recuperável. Revogue e gere outro
                      apenas se necessário.
                    </span>
                  ) : null}

                  {coach.ballotSubmittedAt ? (
                    <span className="self-center text-xs text-muted">
                      Voto em{" "}
                      {formatDate(coach.ballotSubmittedAt, {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}

          {!coaches.length ? (
            <p className="py-8 text-center text-sm text-muted">
              Nenhum técnico sincronizado ainda.
            </p>
          ) : null}
        </div>
      </section>
    </div>
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
              O backend abre a edição quando as categorias de voto estão configuradas
              e os treinadores da divisão/categoria já foram sincronizados. Os atletas
              são carregados automaticamente durante a votação.
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
              votação. Você ainda pode acompanhar convites, cadastros e votos.
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

function AccessBadge({
  state,
}: {
  state: CoachAdminAccessState;
}) {
  return (
    <span className="rounded-full border border-white/10 bg-panel px-3 py-1.5 text-xs font-black text-muted">
      {accessLabels[state]}
    </span>
  );
}
