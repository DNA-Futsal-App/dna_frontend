"use client";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  Clipboard,
  LoaderCircle,
  Plus,
  ShieldCheck,
  UserX,
  UserCheck,
  Trash2,
  XCircle,
} from "lucide-react";
import { clientApi, formatDate } from "@/lib/client-api";
import type {
  CoachAccessLinkInfo,
  CoachCredential,
  CreateCoachAccessLinkResult,
} from "@/lib/awards-types";
import type { AdminAwardEdition } from "@/lib/admin-awards-types";
import type { CatalogCategory, CatalogItem, Team } from "@/lib/types";
import { useCoachCompetitionLabels, type CoachCompetitionContext } from "@/lib/use-coach-competition-labels";
import { CoachBallotsPanel } from "@/components/awards/coach-ballots-panel";

export default function TechnicalJuryAdminPage() {
  const [editions, setEditions] = useState<AdminAwardEdition[]>([]);
  const [editionId, setEditionId] = useState("");
  const [link, setLink] = useState<CoachAccessLinkInfo | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [voters, setVoters] = useState<CoachCredential[]>([]);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<CoachSearchFilters>({
    name: "", email: "", phone: "", team: "",
  });
  // The official catalogue supplies titles, divisions and categories; never infer
  // a competition from a numeric ID (male and female IDs can overlap).
  const [championships, setChampionships] = useState<CatalogItem[]>([]);
  const [championship, setChampionship] = useState("");
  const [competitionDivisions, setCompetitionDivisions] = useState<CatalogItem[]>([]);
  const [competitionDivisionId, setCompetitionDivisionId] = useState("");
  const [competitionCategories, setCompetitionCategories] = useState<CatalogCategory[]>([]);
  const [competitionCategoryId, setCompetitionCategoryId] = useState("");
  const [catalogError, setCatalogError] = useState("");
  const editionSeason = editions.find((item) => item.id === editionId)?.season;
  const chosenCategory = competitionCategories.find(
    (item) => `${item.eventId}:${item.id}` === competitionCategoryId,
  );
  const competitionFilterActive = Boolean(championship && competitionDivisionId && chosenCategory);
  const competitionFilterIncomplete = Boolean(championship && !competitionFilterActive);
  const competitionLabel = useCoachCompetitionLabels(voters.flatMap((voter) =>
    voter.contexts.map((context) => ({ ...context, season: voter.season })),
  ));
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  // One coach per card (even if assigned to multiple categories). Group by the
  // highest-priority official category and show at most ten coaches per page.
  const matchesSelectedCompetition = (context: CoachCredential["contexts"][number]) =>
    !competitionFilterActive || (chosenCategory !== undefined &&
      context.eventId === chosenCategory.eventId &&
      context.divisionId === Number(competitionDivisionId) &&
      context.categoryId === chosenCategory.id);
  const mainLabel = (voter: CoachCredential) => {
    const matchingContexts = voter.contexts.filter(matchesSelectedCompetition);
    const activeContexts = matchingContexts.filter((context) => context.active);
    const relevantContexts = activeContexts.length ? activeContexts : matchingContexts;
    const labels = relevantContexts.map((context) =>
      competitionLabel({ ...context, season: voter.season }),
    ).filter((label) => !label.startsWith("Carregando") && !label.startsWith("Categoria esportiva"));
    return labels.sort((a, b) => compareCompetition(a, b))[0] ?? "Sem categoria identificada";
  };
  // Filter the complete edition first; only then paginate into groups of 10.
  // Inactive coach contexts remain searchable for administrative reactivation.
  const filtered = voters.filter((voter) =>
    matchesCoachFilters(voter, filters) &&
    (!competitionFilterActive || voter.contexts.some(matchesSelectedCompetition)),
  );
  const sorted = [...filtered].sort((a, b) =>
    compareCompetition(mainLabel(a), mainLabel(b)) ||
    a.coachName.localeCompare(b.coachName, "pt-BR"),
  );
  const totalPages = Math.max(1, Math.ceil(sorted.length / 10));
  const currentPage = Math.min(page, totalPages);
  const visible = sorted.slice((currentPage - 1) * 10, currentPage * 10);
  function updateFilter(field: keyof CoachSearchFilters, value: string) {
    setFilters((previous) => ({ ...previous, [field]: value }));
    setPage(1);
  }
  function clearCompetitionFilters() {
    setChampionship("");
    setCompetitionDivisionId("");
    setCompetitionCategoryId("");
    setCompetitionDivisions([]);
    setCompetitionCategories([]);
    setCatalogError("");
    setPage(1);
  }
  useEffect(() => {
    let active = true;
    if (!editionSeason) { return; }
    clientApi<CatalogItem[]>(`/api/catalog/titles?season=${editionSeason}`)
      .then((items) => {
        if (!active) return;
        // Only these two Paulista championships participate in the award.
        setChampionships(items.filter((item) =>
          item.name.trim() === "Paulista" || item.name.trim() === "Paulista Feminino",
        ));
      })
      .catch((err: unknown) => {
        if (active) setCatalogError(err instanceof Error ? err.message : "Erro ao carregar campeonatos.");
      });
    return () => { active = false; };
  }, [editionSeason]);
  useEffect(() => {
    let active = true;
    if (!editionSeason || !championship) return;
    const query = new URLSearchParams({ season: String(editionSeason), title: championship });
    clientApi<CatalogItem[]>(`/api/catalog/divisions?${query}`)
      .then((items) => { if (active) setCompetitionDivisions(items); })
      .catch((err: unknown) => {
        if (active) setCatalogError(err instanceof Error ? err.message : "Erro ao carregar divisões.");
      });
    return () => { active = false; };
  }, [editionSeason, championship]);
  useEffect(() => {
    let active = true;
    if (!editionSeason || !championship || !competitionDivisionId) return;
    const query = new URLSearchParams({
      season: String(editionSeason), title: championship, divisionId: competitionDivisionId,
    });
    clientApi<CatalogCategory[]>(`/api/catalog/categories?${query}`)
      .then((items) => { if (active) setCompetitionCategories(items); })
      .catch((err: unknown) => {
        if (active) setCatalogError(err instanceof Error ? err.message : "Erro ao carregar categorias.");
      });
    return () => { active = false; };
  }, [editionSeason, championship, competitionDivisionId]);
  async function load(id: string) {
    const [l, v] = await Promise.all([
      clientApi<CoachAccessLinkInfo>(
        `/api/admin/awards/editions/${id}/coach-access-link`,
      ),
      clientApi<CoachCredential[]>(
        `/api/admin/awards/editions/${id}/coach-voters`,
      ),
    ]);
    setLink(l);
    setVoters(v);
  }
  useEffect(() => {
    clientApi<AdminAwardEdition[]>("/api/admin/awards/editions")
      .then(async (r) => {
        setEditions(r);
        if (r[0]) {
          setEditionId(r[0].id);
          await load(r[0].id);
        }
      })
      .catch((e) =>
        setError(
          e instanceof Error
            ? e.message
            : "Não foi possível carregar o júri técnico.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);
  async function generate() {
    setBusy("link");
    setError("");
    try {
      const r = await clientApi<CreateCoachAccessLinkResult>(
        `/api/admin/awards/editions/${editionId}/coach-access-link`,
        { method: "POST" },
      );
      setGeneratedUrl(r.accessUrl);
      await load(editionId);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível gerar o link.",
      );
    } finally {
      setBusy("");
    }
  }
  async function revoke() {
    if (
      !window.confirm(
        "Revogar o link atual? Os treinadores já credenciados continuarão com acesso.",
      )
    )
      return;
    setBusy("link");
    try {
      await clientApi(
        `/api/admin/awards/editions/${editionId}/coach-access-link/revoke`,
        { method: "POST" },
      );
      setGeneratedUrl("");
      await load(editionId);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível revogar o link.",
      );
    } finally {
      setBusy("");
    }
  }
  if (loading)
    return (
      <div className="flex min-h-80 items-center justify-center">
        <LoaderCircle className="size-9 animate-spin text-cyan" />
      </div>
    );
  return (
    <div className="grid gap-6">
      <header>
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-amber">
          <ShieldCheck className="size-5" />
          Administração
        </div>
        <h1 className="display-title mt-3 text-3xl sm:text-4xl">
          Júri técnico
        </h1>
        <p className="mt-2 text-sm text-muted">
          Gere o link único e gerencie contextos extras dos treinadores.
        </p>
      </header>
      <Link
        className="btn-primary w-fit"
        href="/app/admin/premio-dna/juri-tecnico/links-por-categoria"
      >
        Gerenciar convites por categoria
      </Link>
      <label className="grid max-w-sm gap-1.5 text-sm font-bold">
        Edição
        <select
          className="field"
          value={editionId}
          onChange={(e) => {
            setEditionId(e.target.value);
            setFilters({ name: "", email: "", phone: "", team: "" });
            clearCompetitionFilters();
            setChampionships([]);
            setPage(1);
            setGeneratedUrl("");
            void load(e.target.value);
          }}
        >
          {editions.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
      </label>
      {error ? (
        <p className="rounded-xl border border-coral/25 bg-coral/8 px-4 py-3 text-sm text-[#ffb195]">
          {error}
        </p>
      ) : null}
      <section className="rounded-3xl border border-white/8 bg-panel p-5 sm:p-6">
        <h2 className="text-xl font-black">Link único de credenciamento</h2>
        <p className="mt-2 text-sm text-muted">
          Status:{" "}
          <strong className={link?.available ? "text-cyan" : "text-muted"}>
            {link?.status ?? "NONE"}
          </strong>
        </p>
        {generatedUrl ? (
          <div className="mt-4 flex gap-2">
            <input
              className="field min-w-0 flex-1"
              readOnly
              value={generatedUrl}
              onFocus={(e) => e.currentTarget.select()}
            />
            <button
              type="button"
              className="btn-primary"
              onClick={() => void navigator.clipboard.writeText(generatedUrl)}
            >
              <Clipboard className="size-4" />
              Copiar
            </button>
          </div>
        ) : link?.available ? (
          <p className="mt-4 text-xs text-muted">
            Por segurança, o token completo só aparece no momento da geração.
            Para obter outro endereço, revogue e gere um novo.
          </p>
        ) : null}
        <div className="mt-5 flex gap-2">
          {!link?.available ? (
            <button
              type="button"
              className="btn-primary"
              onClick={() => void generate()}
              disabled={busy === "link"}
            >
              {busy === "link" ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Gerar link
            </button>
          ) : (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => void revoke()}
              disabled={busy === "link"}
            >
              <XCircle className="size-4" />
              Revogar link
            </button>
          )}
        </div>
      </section>
      <section className="rounded-3xl border border-white/8 bg-panel p-5 sm:p-6">
        <h2 className="text-xl font-black">Treinadores credenciados</h2>
        <p className="mt-1 text-sm text-muted">
          {voters.length} treinador(es) •{" "}
          {voters.reduce((s, x) => s + x.contexts.length, 0)} contexto(s)
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1 text-sm font-bold">
            Campeonato
            <select aria-label="Filtrar por campeonato" className="field"
              value={championship} disabled={!editionSeason || championships.length === 0}
              onChange={(event) => {
                setChampionship(event.target.value);
                setCompetitionDivisionId("");
                setCompetitionCategoryId("");
                setCompetitionDivisions([]);
                setCompetitionCategories([]);
                setCatalogError("");
                setPage(1);
              }}>
              <option value="">Selecione o campeonato</option>
              {championships.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name.trim() === "Paulista" ? "Paulista Masculino" : "Paulista Feminino"}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Divisão
            <select aria-label="Filtrar por divisão" className="field"
              value={competitionDivisionId}
              disabled={!championship || competitionDivisions.length === 0}
              onChange={(event) => {
                setCompetitionDivisionId(event.target.value);
                setCompetitionCategoryId("");
                setCompetitionCategories([]);
                setCatalogError("");
                setPage(1);
              }}>
              <option value="">Selecione a divisão</option>
              {competitionDivisions.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Categoria
            <select aria-label="Filtrar por categoria" className="field"
              value={competitionCategoryId}
              disabled={!competitionDivisionId || competitionCategories.length === 0}
              onChange={(event) => { setCompetitionCategoryId(event.target.value); setPage(1); }}>
              <option value="">Selecione a categoria</option>
              {competitionCategories.map((item) => (
                <option key={`${item.eventId}:${item.id}`} value={`${item.eventId}:${item.id}`}>{item.name}</option>
              ))}
            </select>
          </label>
        </div>
        {catalogError ? <p role="alert" className="mt-2 text-sm text-coral">{catalogError}</p> : null}
        <p className="mt-2 text-xs text-muted" aria-live="polite">
          {competitionFilterActive
            ? `Exibindo técnicos vinculados a ${championship} · ${competitionDivisions.find((d) => String(d.id) === competitionDivisionId)?.name ?? "Divisão"} · ${chosenCategory?.name ?? "Categoria"}.`
            : competitionFilterIncomplete
              ? "Escolha campeonato, divisão e categoria para aplicar o filtro esportivo."
              : "Selecione campeonato, divisão e categoria para localizar todos os técnicos da combinação."}
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-1 text-sm font-bold">
            Nome
            <input aria-label="Filtrar por nome" type="search" className="field"
              placeholder="Nome do treinador" value={filters.name}
              onChange={(event) => updateFilter("name", event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-bold">
            E-mail
            <input aria-label="Filtrar por e-mail" type="search" className="field"
              placeholder="E-mail do treinador" value={filters.email}
              onChange={(event) => updateFilter("email", event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Telefone
            <input aria-label="Filtrar por telefone" type="tel" inputMode="tel" className="field"
              placeholder="DDD ou número" value={filters.phone}
              onChange={(event) => updateFilter("phone", event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Time
            <input aria-label="Filtrar por time" type="search" className="field"
              placeholder="Equipe do treinador" value={filters.team}
              onChange={(event) => updateFilter("team", event.target.value)} />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted" aria-live="polite">
          <span>{filtered.length} de {voters.length} treinador(es) encontrado(s) · Página {currentPage} de {totalPages} · A1 primeiro</span>
          <button type="button" className="btn-ghost" onClick={() => {
            setFilters({ name: "", email: "", phone: "", team: "" });
            clearCompetitionFilters();
          }} disabled={!Object.values(filters).some((value) => value.trim()) && !championship}>
            Limpar filtros
          </button>
        </div>
        <div className="mt-5 grid gap-4">
          {visible.map((v, index) => {
            const group = mainLabel(v);
            const previous = index > 0 ? mainLabel(visible[index - 1]) : null;
            return <div key={v.credentialId} className="grid gap-3">
              {group !== previous ? (
                <h3 className="border-b border-white/10 pb-2 text-sm font-black text-cyan">
                  {group}
                </h3>
              ) : null}
              <CoachCard
                voter={v}
                competitionLabel={competitionLabel}
                reload={async () => load(editionId)}
                setError={setError}
              />
            </div>;
          })}
          {!visible.length ? (
            <p className="py-8 text-center text-sm text-muted">
              {voters.length ? "Nenhum treinador encontrado com esses filtros." : "Nenhum treinador credenciado."}
            </p>
          ) : null}
        </div>
        {totalPages > 1 ? (
          <div className="mt-5 flex items-center justify-between gap-3">
            <button type="button" className="btn-ghost" disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}>Anterior</button>
            <span className="text-xs text-muted">{currentPage} / {totalPages}</span>
            <button type="button" className="btn-ghost" disabled={currentPage >= totalPages}
              onClick={() => setPage(currentPage + 1)}>Próxima</button>
          </div>
        ) : null}
      </section>
    </div>
  );
}

type CoachSearchFilters = {
  name: string;
  email: string;
  phone: string;
  team: string;
};

function normalizedCoachText(value: string | null | undefined): string {
  return (value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function matchesCoachFilters(voter: CoachCredential, filters: CoachSearchFilters): boolean {
  const phoneQuery = filters.phone.replace(/\D/g, "");
  return normalizedCoachText(voter.coachName).includes(normalizedCoachText(filters.name))
    && normalizedCoachText(voter.email).includes(normalizedCoachText(filters.email))
    && (!filters.phone.trim() || (phoneQuery.length > 0
      && (voter.phone ?? "").replace(/\D/g, "").includes(phoneQuery)))
    && (!filters.team.trim() || voter.contexts.some((context) =>
      normalizedCoachText(context.teamName).includes(normalizedCoachText(filters.team))));
}

/** Sort by official division (A1 before A2), then by Sub age, never by opaque IDs. */
function compareCompetition(a: string, b: string) {
  function key(label: string): [number, number, string] {
    const [division = "", category = ""] = label.split("·").map((part) => part.trim());
    const divisionMatch = /^A\s*(\d+)$/i.exec(division);
    const divisionOrder = divisionMatch ? Number(divisionMatch[1]) : 999;
    const subMatch = /sub[- ]?(\d+)/i.exec(category);
    return [divisionOrder, subMatch ? Number(subMatch[1]) : 999, label];
  }
  const left = key(a);
  const right = key(b);
  return left[0] - right[0] || left[1] - right[1] || left[2].localeCompare(right[2], "pt-BR");
}

function CoachCard({
  voter,
  competitionLabel,
  reload,
  setError,
}: {
  voter: CoachCredential;
  competitionLabel: (context: CoachCompetitionContext) => string;
  reload: () => Promise<void>;
  setError: (m: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showVotes, setShowVotes] = useState(false);
  const hasVotes = voter.contexts.some((context) => context.submitted);
  async function deactivateContext(id: string) {
    if (!window.confirm("Desativar este contexto?")) return;
    setBusy(true);
    try {
      await clientApi(
        `/api/admin/awards/coach-voters/${voter.credentialId}/contexts/${id}/deactivate`,
        { method: "POST" },
      );
      await reload();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível desativar o contexto.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function reactivateContext(id: string) {
    if (!window.confirm(`Reabilitar somente esta categoria de ${voter.coachName}? Votos anteriores não serão recuperados.`)) return;
    setBusy(true);
    setError("");
    try {
      await clientApi(
        `/api/admin/awards/coach-voters/${voter.credentialId}/contexts/${id}/reactivate`,
        { method: "POST" },
      );
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível reabilitar esta categoria.");
    } finally {
      setBusy(false);
    }
  }
  async function deactivateCoach() {
    if (!window.confirm(`Desativar ${voter.coachName}? Todas as cédulas e votos deste treinador nesta edição serão apagados. A conta DNA Futsal será preservada.`)) return;
    setBusy(true);
    try {
      await clientApi(
        `/api/admin/awards/coach-voters/${voter.credentialId}/deactivate`,
        { method: "POST" },
      );
      await reload();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível desativar o treinador.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function reactivateCoach() {
    if (!window.confirm(`Reabilitar ${voter.coachName} como votante? Os votos anteriores não serão recuperados.`)) return;
    setBusy(true);
    try {
      await clientApi(`/api/admin/awards/coach-voters/${voter.credentialId}/reactivate`, { method: "POST" });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível reabilitar o treinador.");
    } finally { setBusy(false); }
  }
  async function removeCoach() {
    if (!window.confirm(`Excluir ${voter.coachName} da lista do júri técnico? A conta DNA Futsal será mantida, mas o credenciamento deixará de aparecer na administração.`)) return;
    setBusy(true);
    try {
      await clientApi(`/api/admin/awards/coach-voters/${voter.credentialId}/remove`, { method: "POST" });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível remover o treinador do júri.");
    } finally { setBusy(false); }
  }
  return (
    <div className="rounded-2xl border border-white/7 bg-night/35 p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <button
            type="button"
            className="block w-full rounded-lg text-left focus-visible:outline-2 focus-visible:outline-cyan enabled:hover:text-cyan"
            disabled={!hasVotes || busy}
            aria-expanded={hasVotes ? showVotes : undefined}
            aria-label={hasVotes ? `${showVotes ? "Ocultar" : "Ver"} votos de ${voter.coachName}` : undefined}
            onClick={() => setShowVotes((previous) => !previous)}
          >
            <strong>{voter.coachName}</strong>
            {hasVotes ? <small className="ml-2 text-xs font-bold text-cyan underline">{showVotes ? "Ocultar votos" : "Ver votos"}</small> : null}
            <small className="mt-1 block text-xs text-cyan">{voter.email}</small>
            <small className="mt-1 block text-xs text-muted">
              Credenciado em{" "}
              {formatDate(voter.createdAt, { dateStyle: "short", timeStyle: "short" })}
            </small>
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {voter.active ? (
            <button type="button" className="btn-ghost" onClick={() => void deactivateCoach()} disabled={busy}>
              <UserX className="size-4" /> Desativar
            </button>
          ) : (
            <>
              <span className="self-center text-xs font-bold text-amber">ACESSO DESATIVADO</span>
              <button type="button" className="btn-ghost" onClick={() => void reactivateCoach()} disabled={busy}>
                <UserCheck className="size-4" /> Reabilitar
              </button>
              <button type="button" className="btn-ghost border-coral/30 text-coral" onClick={() => void removeCoach()} disabled={busy}>
                <Trash2 className="size-4" /> Excluir dos técnicos
              </button>
            </>
          )}
        </div>
      </div>
      <div className="mt-4 grid gap-2">
        {voter.contexts.map((c) => (
          <div
            key={c.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/6 bg-panel/60 px-4 py-3"
          >
            <div>
              <strong className="text-sm">{c.teamName}</strong>
              <small className="mt-1 block text-xs text-muted">
                {competitionLabel({ ...c, season: voter.season })} • {c.source}
              </small>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-black ${c.submitted ? "text-cyan" : "text-amber"}`}
              >
                {c.submitted ? "VOTOU" : c.active ? "PENDENTE" : "DESATIVADO"}
              </span>
              {voter.active && c.active ? (
                <button
                  type="button"
                  className="btn-ghost min-h-9! px-3! py-1.5! text-xs"
                  onClick={() => void deactivateContext(c.id)}
                  disabled={busy}
                >
                  Desativar
                </button>
              ) : voter.active && !c.active ? (
                <button
                  type="button"
                  className="btn-ghost min-h-9! px-3! py-1.5! text-xs"
                  onClick={() => void reactivateContext(c.id)}
                  disabled={busy}
                >
                  <UserCheck className="size-4" /> Reabilitar categoria
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      {hasVotes && showVotes ? (
        <CoachBallotsPanel
          key={voter.contexts.filter((context) => context.submitted).map((context) => context.id).join(":")}
          editionId={voter.editionId}
          credentialId={voter.credentialId}
          season={voter.season}
          competitionLabel={competitionLabel}
        />
      ) : null}
      {!voter.active ? null : adding ? (
        <ContextForm
          voter={voter}
          done={async () => {
            setAdding(false);
            await reload();
          }}
          cancel={() => setAdding(false)}
          setError={setError}
        />
      ) : (
        <button
          type="button"
          className="btn-primary mt-4"
          onClick={() => setAdding(true)}
        >
          <Plus className="size-4" />
          Adicionar categoria
        </button>
      )}
    </div>
  );
}

function ContextForm({
  voter,
  done,
  cancel,
  setError,
}: {
  voter: CoachCredential;
  done: () => Promise<void>;
  cancel: () => void;
  setError: (m: string) => void;
}) {
  const [gender, setGender] = useState<"MALE" | "FEMALE">("MALE");
  const title = gender === "FEMALE" ? "Paulista Feminino" : "Paulista";
  const [divisions, setDivisions] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [divisionId, setDivisionId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [saving, setSaving] = useState(false);
  const category = categories.find((x) => String(x.id) === categoryId) ?? null;
  useEffect(() => {
    let active = true;
    const query = new URLSearchParams({ season: String(voter.season), title });
    clientApi<CatalogItem[]>(`/api/catalog/divisions?${query}`)
      .then((items) => { if (active) setDivisions(items); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Não foi possível carregar divisões."); });
    return () => { active = false; };
  }, [voter.season, title]);
  useEffect(() => {
    if (!divisionId) return;
    let active = true;
    const query = new URLSearchParams({
      season: String(voter.season), divisionId, title,
    });
    clientApi<CatalogCategory[]>(`/api/catalog/categories?${query}`)
      .then((items) => { if (active) setCategories(items); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Não foi possível carregar categorias."); });
    return () => { active = false; };
  }, [divisionId, voter.season, title]);
  useEffect(() => {
    if (!category?.eventId) return;
    let active = true;
    clientApi<Team[]>(
      `/api/catalog/teams?eventId=${encodeURIComponent(String(category.eventId))}`,
    )
      .then((items) => { if (active) setTeams(items); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Não foi possível carregar equipes."); });
    return () => { active = false; };
  }, [category?.eventId]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!category || !teamId) return;
    setSaving(true);
    setError("");
    try {
      await clientApi(
        `/api/admin/awards/coach-voters/${voter.credentialId}/contexts`,
        {
          method: "POST",
          body: JSON.stringify({
            credentialId: voter.credentialId,
            eventId: category.eventId,
            divisionId: Number(divisionId),
            categoryId: Number(category.id),
            gender,
            teamId,
          }),
        },
      );
      await done();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível adicionar o contexto.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <form
      onSubmit={submit}
      className="mt-4 grid gap-3 rounded-xl border border-cyan/15 bg-cyan/5 p-4 md:grid-cols-4"
    >
      <select
        className="field"
        aria-label="Modalidade"
        value={gender}
        onChange={(e) => {
          setGender(e.target.value as "MALE" | "FEMALE");
          setDivisions([]);
          setCategories([]);
          setTeams([]);
          setDivisionId("");
          setCategoryId("");
          setTeamId("");
        }}
      >
        <option value="MALE">Masculino</option>
        <option value="FEMALE">Feminino</option>
      </select>
      <select
        className="field"
        value={divisionId}
        onChange={(e) => {
          setDivisionId(e.target.value);
          setCategoryId("");
          setTeamId("");
          setCategories([]);
          setTeams([]);
        }}
        required
      >
        <option value="">Divisão</option>
        {divisions.map((x) => (
          <option key={x.id} value={x.id}>
            {x.name}
          </option>
        ))}
      </select>
      <select
        className="field"
        value={categoryId}
        onChange={(e) => {
          setCategoryId(e.target.value);
          setTeamId("");
          setTeams([]);
        }}
        disabled={!divisionId}
        required
      >
        <option value="">Categoria</option>
        {categories.map((x) => (
          <option key={x.id} value={x.id}>
            {x.name}
          </option>
        ))}
      </select>
      <select
        className="field"
        value={teamId}
        onChange={(e) => setTeamId(e.target.value)}
        disabled={!category?.eventId}
        required
      >
        <option value="">Time</option>
        {teams.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      <div className="flex gap-2 md:col-span-4 md:justify-end">
        <button type="button" className="btn-ghost" onClick={cancel}>
          Cancelar
        </button>
        <button className="btn-primary" disabled={saving || !category || !teamId}>
          {saving ? <LoaderCircle className="size-4 animate-spin" /> : null}
          Liberar votação
        </button>
      </div>
    </form>
  );
}
