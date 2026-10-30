/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  ExternalLink,
  LoaderCircle,
  LockKeyhole,
  PlayCircle,
  RefreshCw,
  Save,
  Trophy,
} from "lucide-react";
import { ClientApiError, clientApi } from "@/lib/client-api";
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
type Entry = {
  entryId: string;
  registrationId: string;
  registrationNumber: number;
  athleteName: string;
  athleteInstagram: string;
  teamName: string;
  sourceType: "UPLOAD" | "LINK";
  externalUrl: string | null;
  scoresCount: number;
  average: number | null;
  myScore: number | null;
  finalistRank: number | null;
};
type Board = {
  entries: Entry[];
  pendingReview: number;
  approvedCount: number;
  fullyScoredCount: number;
  votersCount: number;
  registrationsOpen: boolean;
  published: boolean;
  readyToFinalize: boolean;
};

function contextKey(context: Context): string {
  return [context.eventId, context.divisionId, context.categoryId, context.gender, context.contestCategory].join("|");
}

function contextParams(context: Context): string {
  return new URLSearchParams({
    eventId: String(context.eventId),
    divisionId: String(context.divisionId),
    categoryId: String(context.categoryId),
    gender: context.gender,
    contestCategory: context.contestCategory,
  }).toString();
}

function uniqueOptions<T extends string | number>(values: T[]): T[] {
  return Array.from(new Set(values));
}

export default function AwardPreVoteAdminPage() {
  const [editions, setEditions] = useState<AdminAwardEdition[]>([]);
  const [editionId, setEditionId] = useState("");
  const [contexts, setContexts] = useState<Context[]>([]);
  const [selected, setSelected] = useState<Context | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [media, setMedia] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingBoard, setLoadingBoard] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    clientApi<AdminAwardEdition[]>("/api/admin/awards/editions")
      .then((value) => {
        if (!active) return;
        setEditions(value);
        setEditionId(value[0]?.id ?? "");
      })
      .catch((err: unknown) => {
        if (!active) return;
        if (err instanceof ClientApiError && err.status === 403) setForbidden(true);
        else setError(err instanceof Error ? err.message : "Não foi possível carregar as edições.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    if (!editionId) return;
    clientApi<Context[]>(`/api/admin/awards/editions/${editionId}/pre-vote/contexts`)
      .then((items) => {
        if (!active) return;
        setContexts(items);
        setSelected(items[0] ?? null);
        setBoard(null);
        setDrafts({});
        setMedia({});
        setError("");
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Erro ao carregar as categorias aprovadas.");
      });
    return () => { active = false; };
  }, [editionId]);

  const selectionKey = selected ? contextKey(selected) : "";
  useEffect(() => {
    let active = true;
    if (!editionId || !selected) return;
    setLoadingBoard(true);
    setBoard(null);
    setDrafts({});
    setMedia({});
    setNotice("");
    clientApi<Board>(`/api/admin/awards/editions/${editionId}/pre-vote?${contextParams(selected)}`)
      .then((value) => { if (active) setBoard(value); })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Erro ao carregar os vídeos.");
      })
      .finally(() => { if (active) setLoadingBoard(false); });
    return () => { active = false; };
    // A seleção é identificada pelo conjunto de cinco chaves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editionId, selectionKey]);

  function choose(field: keyof Pick<Context, "eventId" | "divisionId" | "categoryId" | "gender" | "contestCategory">, raw: string) {
    if (!selected) return;
    const value = ["eventId", "divisionId", "categoryId"].includes(field) ? Number(raw) : raw;
    const options = contexts.filter((context) => context[field] === value);
    if (!options.length) return;
    const matching = options.find((context) =>
      (field === "eventId" || context.eventId === selected.eventId) &&
      (field === "divisionId" || context.divisionId === selected.divisionId) &&
      (field === "categoryId" || context.categoryId === selected.categoryId) &&
      (field === "gender" || context.gender === selected.gender) &&
      (field === "contestCategory" || context.contestCategory === selected.contestCategory)
    );
    setSelected(matching ?? options[0]);
    setError("");
  }

  async function refresh() {
    if (!selected || !editionId) return;
    setLoadingBoard(true);
    try {
      const value = await clientApi<Board>(`/api/admin/awards/editions/${editionId}/pre-vote?${contextParams(selected)}`);
      setBoard(value);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível atualizar.");
    } finally {
      setLoadingBoard(false);
    }
  }

  async function saveScore(entry: Entry) {
    const value = Number(drafts[entry.entryId] ?? entry.myScore ?? "");
    if (!Number.isInteger(value) || value < 1 || value > 10) {
      setError("Selecione uma nota válida de 1 a 10.");
      return;
    }
    setBusy(entry.entryId);
    setError("");
    try {
      const result = await clientApi<Board>(
        `/api/admin/awards/editions/${editionId}/pre-vote/entries/${entry.entryId}/score`,
        { method: "POST", body: JSON.stringify({ score: value }) },
      );
      setBoard(result);
      setNotice(`Nota de ${entry.athleteName} salva com sucesso.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar a nota.");
    } finally {
      setBusy(null);
    }
  }

  async function loadMedia(entry: Entry) {
    setBusy(entry.entryId);
    setError("");
    try {
      const ticket = await clientApi<AdminAwardMediaTicket>(
        `/api/admin/awards/registrations/${entry.registrationId}/entries/${entry.entryId}/media-ticket`,
        { method: "POST" },
      );
      setMedia((current) => ({ ...current, [entry.entryId]: ticket.url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível abrir o vídeo privado.");
    } finally {
      setBusy(null);
    }
  }

  async function finalize() {
    if (!selected || !board?.readyToFinalize) return;
    if (!window.confirm("Confirmar os três finalistas? A classificação será congelada e não será possível alterar as notas deste grupo.")) return;
    setBusy("finalize");
    setError("");
    try {
      const result = await clientApi<Board>(
        `/api/admin/awards/editions/${editionId}/pre-vote/finalize`,
        { method: "POST", body: JSON.stringify({
          eventId: selected.eventId,
          divisionId: selected.divisionId,
          categoryId: selected.categoryId,
          gender: selected.gender,
          contestCategory: selected.contestCategory,
        }) },
      );
      setBoard(result);
      setNotice("Os três finalistas foram confirmados para a próxima etapa.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível publicar os finalistas.");
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <div className="flex min-h-80 items-center justify-center"><LoaderCircle className="size-8 animate-spin text-cyan" /></div>;
  if (forbidden) return (
    <section className="surface rounded-3xl p-8">
      <LockKeyhole className="size-8 text-coral" />
      <h1 className="display-title mt-3 text-3xl">Acesso restrito</h1>
      <p className="mt-3 text-muted">Somente administradores do DNA Futsal podem avaliar vídeos.</p>
    </section>
  );

  const events = uniqueOptions(contexts.map((item) => item.eventId));
  const divisions = uniqueOptions(contexts.filter((item) => item.eventId === selected?.eventId).map((item) => item.divisionId));
  const divisionContexts = contexts.filter((item) => item.eventId === selected?.eventId && item.divisionId === selected?.divisionId);
  const categories = uniqueOptions(divisionContexts.map((item) => item.categoryId));
  const categoryContexts = divisionContexts.filter((item) => item.categoryId === selected?.categoryId);
  const genders = uniqueOptions(categoryContexts.map((item) => item.gender));
  const contests = uniqueOptions(categoryContexts.filter((item) => item.gender === selected?.gender).map((item) => item.contestCategory));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <Link href="/app/admin/premio-dna" className="inline-flex items-center gap-2 text-sm font-bold text-muted hover:text-ivory">
          <ArrowLeft className="size-4" /> Voltar ao painel do prêmio
        </Link>
        <p className="eyebrow mt-6"><BadgeCheck className="size-4" /> Avaliação administrativa</p>
        <h1 className="display-title mt-2 text-4xl">Pré-votação do Prêmio DNA Futsal</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted">Avalie cada vídeo aprovado de 1 a 10. As médias determinam os três finalistas por campeonato, divisão, categoria, gênero e prêmio.</p>
      </header>

      <section className="surface rounded-3xl p-5 sm:p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <label className="grid gap-2 text-sm font-bold">Edição
            <select className="field" value={editionId} disabled={busy !== null} onChange={(event) => {
              setSelected(null);
              setContexts([]);
              setBoard(null);
              setEditionId(event.target.value);
            }}>
              {editions.map((edition) => <option key={edition.id} value={edition.id}>{edition.name}</option>)}
            </select>
          </label>
          {selected && <>
            <label className="grid gap-2 text-sm font-bold">Campeonato (evento)
              <select className="field" value={selected.eventId} disabled={busy !== null} onChange={(event) => choose("eventId", event.target.value)}>
                {events.map((value) => <option key={value} value={value}>Evento FPFS #{value}</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold">Divisão
              <select className="field" value={selected.divisionId} disabled={busy !== null} onChange={(event) => choose("divisionId", event.target.value)}>
                {divisions.map((value) => <option key={value} value={value}>{contexts.find((item) => item.eventId === selected.eventId && item.divisionId === value)?.divisionName ?? value}</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold">Categoria do campeonato
              <select className="field" value={selected.categoryId} disabled={busy !== null} onChange={(event) => choose("categoryId", event.target.value)}>
                {categories.map((value) => <option key={value} value={value}>{divisionContexts.find((item) => item.categoryId === value)?.categoryName ?? value}</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold">Gênero
              <select className="field" value={selected.gender} disabled={busy !== null} onChange={(event) => choose("gender", event.target.value)}>
                {genders.map((value) => <option key={value} value={value}>{value === "FEMALE" ? "Feminino" : "Masculino"}</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold">Categoria do prêmio
              <select className="field" value={selected.contestCategory} disabled={busy !== null} onChange={(event) => choose("contestCategory", event.target.value)}>
                {contests.map((value) => <option key={value} value={value}>{categoryContexts.find((item) => item.contestCategory === value)?.contestCategoryLabel ?? value}</option>)}
              </select>
            </label>
          </>}
        </div>
        {!selected && <p className="mt-5 text-sm text-muted">Não há vídeos aprovados nesta edição.</p>}
      </section>

      {error && <p role="alert" className="rounded-2xl border border-coral/30 p-4 text-sm text-coral">{error}</p>}
      {notice && <p role="status" className="rounded-2xl border border-cyan/30 p-4 text-sm text-cyan">{notice}</p>}

      {selected && <>
        <section className="surface rounded-3xl p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-ivory">Classificação da pré-votação</h2>
              <p className="mt-2 text-sm text-muted">
                {board?.approvedCount ?? 0} vídeos aprovados • {board?.fullyScoredCount ?? 0} com notas • {board?.pendingReview ?? 0} aguardando revisão
              </p>
              <p className="mt-1 text-xs text-muted">Cada administrador pode dar uma nota por vídeo e alterá-la até a publicação. Todos devem avaliar os mesmos vídeos.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-ghost" disabled={loadingBoard} onClick={() => void refresh()}>
                <RefreshCw className={`size-4 ${loadingBoard ? "animate-spin" : ""}`} /> Atualizar
              </button>
              {board?.published ? (
                <span className="inline-flex items-center gap-2 rounded-xl border border-cyan/30 px-4 py-2 text-sm font-bold text-cyan"><Trophy className="size-4" /> Finalistas confirmados</span>
              ) : (
                <button type="button" className="btn-primary" disabled={!board?.readyToFinalize || busy !== null} onClick={() => void finalize()}>
                  <Trophy className="size-4" /> Confirmar os 3 finalistas
                </button>
              )}
            </div>
          </div>
          {board && !board.published && <p className="mt-3 text-xs text-muted">
            {board.registrationsOpen ? "Aguardando encerramento das inscrições. " : "Inscrições encerradas. "}
            {board.readyToFinalize ? "O grupo já pode ser publicado." : "A publicação exige três inscritos, revisão concluída, painel completo e ausência de empate na 3ª colocação."}
          </p>}
        </section>

        {loadingBoard && <div className="flex justify-center py-10"><LoaderCircle className="size-8 animate-spin text-cyan" /></div>}
        {!loadingBoard && board?.entries.length === 0 && <p className="surface rounded-2xl p-6 text-muted">Não há inscrições aprovadas para os filtros selecionados.</p>}
        {!loadingBoard && board?.entries.map((entry, index) => {
          const draft = drafts[entry.entryId] ?? String(entry.myScore ?? "");
          const externalUrl = entry.externalUrl && /^https?:\/\//i.test(entry.externalUrl) ? entry.externalUrl : null;
          return (
            <article key={entry.entryId} className="surface rounded-3xl p-5 sm:p-6">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black text-cyan">#{index + 1}</span>
                    <h3 className="text-xl font-black text-ivory">{entry.athleteName}</h3>
                    {entry.finalistRank && <span className="rounded-full border border-amber/30 px-3 py-1 text-xs font-bold text-amber">Finalista #{entry.finalistRank}</span>}
                  </div>
                  <p className="mt-2 text-sm text-muted">{entry.teamName} • Inscrição #{entry.registrationNumber} • @{entry.athleteInstagram.replace(/^@/, "")}</p>
                  {entry.sourceType === "UPLOAD" ? (
                    media[entry.entryId] ? (
                      <video controls playsInline preload="metadata" src={media[entry.entryId]} className="mt-4 aspect-video w-full rounded-xl bg-black object-contain" />
                    ) : (
                      <button type="button" className="btn-ghost mt-4" disabled={busy === entry.entryId} onClick={() => void loadMedia(entry)}>
                        <PlayCircle className="size-4" /> Abrir vídeo privado
                      </button>
                    )
                  ) : externalUrl ? (
                    <a href={externalUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost mt-4 inline-flex">
                      <ExternalLink className="size-4" /> Abrir vídeo externo
                    </a>
                  ) : <p className="mt-4 text-xs text-coral">Link de mídia indisponível.</p>}
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/15 p-5">
                  <p className="text-xs font-black uppercase tracking-widest text-muted">Média das notas</p>
                  <p className="mt-2 text-4xl font-black text-ivory">{entry.average == null ? "—" : entry.average.toFixed(2)}</p>
                  <p className="mt-1 text-xs text-muted">{board.published ? "Média final" : "Médias ocultas até a confirmação"} • {entry.scoresCount} avaliação(ões)</p>
                  <label className="mt-5 grid gap-2 text-sm font-bold">Sua nota (1 a 10)
                    <select className="field" value={draft} disabled={board.published} onChange={(event) => setDrafts((current) => ({ ...current, [entry.entryId]: event.target.value }))}>
                      <option value="">Selecione a nota</option>
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                  </label>
                  <button type="button" className="btn-primary mt-3 w-full" disabled={board.published || busy !== null || !draft || Number(draft) === entry.myScore} onClick={() => void saveScore(entry)}>
                    {busy === entry.entryId ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />} Salvar nota
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </>}
    </div>
  );
}
