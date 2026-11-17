"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ClipboardCheck, LoaderCircle, ShieldCheck, Trophy, X } from "lucide-react";
import { clientApi, formatDate } from "@/lib/client-api";
import type {
  CoachBallot, CoachVotingCandidate, CoachVotingCategory, CoachVotingContext,
  CoachVotingState,
} from "@/lib/awards-types";
import { orderedCoachBallotVotes, orderedVoteCategories, playerSlotLabels, voteCategoryLabel } from "@/lib/coach-voting-display";
import { useCoachCompetitionLabels } from "@/lib/use-coach-competition-labels";

type ApprovedContext = {
  contextId: string;
  editionId: string;
  editionName: string;
  season: number;
  eventId: number;
  divisionId: number;
  categoryId: number;
  gender: "MALE" | "FEMALE" | null;
  teamId: string;
  teamName: string;
  state: CoachVotingState;
  submitted: boolean;
  votingOpensAt: string | null;
  votingClosesAt: string | null;
};

type Choice = {
  teamId: string;
  candidateId: string;
  candidates: CoachVotingCandidate[];
  loading: boolean;
};

type GoldTeam = CoachVotingContext["teams"][number] & { athleteEligible?: boolean };

const endpoint = "/api/awards/coach-category-voting";

export default function CategoryCoachVotingPage() {
  const [contexts, setContexts] = useState<ApprovedContext[]>([]);
  const competitionLabel = useCoachCompetitionLabels(contexts);
  const [selectedId, setSelectedId] = useState("");
  const [context, setContext] = useState<CoachVotingContext | null>(null);
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [receipt, setReceipt] = useState<CoachBallot | null>(null);
  const [loading, setLoading] = useState(true);
  const [contextLoading, setContextLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const selectedRef = useRef("");
  const requestIds = useRef<Record<string, number>>({});

  const openContext = useCallback(async (id: string) => {
    selectedRef.current = id;
    requestIds.current = {};
    setSelectedId(id);
    setChoices({});
    setReceipt(null);
    setConfirm(false);
    setError("");
    setNotice("");
    setContext(null);
    setContextLoading(true);
    try {
      const next = await clientApi<CoachVotingContext>(
        `${endpoint}/context?contextId=${encodeURIComponent(id)}`,
      );
      if (selectedRef.current !== id) return;
      setContext(next);
      if (next.submitted || next.state === "SUBMITTED") {
        const saved = await clientApi<CoachBallot>(
          `${endpoint}/ballot?contextId=${encodeURIComponent(id)}`,
        );
        if (selectedRef.current === id) setReceipt(saved);
      }
    } catch (cause) {
      if (selectedRef.current === id) {
        setError(cause instanceof Error ? cause.message : "Não foi possível abrir esta votação.");
      }
    } finally {
      if (selectedRef.current === id) setContextLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const result = await clientApi<ApprovedContext[]>(`${endpoint}/contexts`);
        if (!active) return;
        setContexts(result);
        const pick = result.find((item) => item.state === "OPEN")
          ?? result.find((item) => !item.submitted) ?? result[0];
        if (pick) await openContext(pick.contextId);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Não foi possível carregar suas categorias.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; selectedRef.current = ""; };
  }, [openContext]);

  // Official division and category labels are loaded by useCoachCompetitionLabels.

  function update(id: string, patch: Partial<Choice>) {
    setChoices((current) => ({
      ...current,
      [id]: { ...{ teamId: "", candidateId: "", candidates: [], loading: false },
        ...current[id], ...patch },
    }));
  }

  async function chooseTeam(category: CoachVotingCategory, teamId: string) {
    const expectedContext = selectedRef.current;
    const sequence = (requestIds.current[category.id] ?? 0) + 1;
    requestIds.current[category.id] = sequence;
    update(category.id, { teamId, candidateId: "", candidates: [], loading: !!teamId });
    if (!teamId) return;
    setError("");
    try {
      const query = new URLSearchParams({
        contextId: expectedContext, voteCategoryId: category.id, teamId,
      });
      const candidates = await clientApi<CoachVotingCandidate[]>(`${endpoint}/candidates?${query}`);
      if (selectedRef.current !== expectedContext || requestIds.current[category.id] !== sequence) return;
      update(category.id, {
        candidates,
        candidateId: category.targetType === "COACH" ? (candidates[0]?.id ?? "") : "",
        loading: false,
      });
    } catch (cause) {
      if (selectedRef.current !== expectedContext || requestIds.current[category.id] !== sequence) return;
      update(category.id, { loading: false });
      setError(cause instanceof Error ? cause.message : "Não foi possível buscar candidatos.");
    }
  }

  const slotLabels = playerSlotLabels(context?.voteCategories ?? []);
  const summary = useMemo(() => (context ? orderedVoteCategories(context.voteCategories) : []).flatMap((category) => {
    const selection = choices[category.id];
    const candidate = selection?.candidates.find((item) => item.id === selection.candidateId);
    return candidate ? [{ category, candidate }] : [];
  }), [context, choices]);
  const complete = !!context && summary.length > 0 &&
    context.voteCategories.every((category) => !category.required || !!choices[category.id]?.candidateId)
    && !Object.values(choices).some((choice) => choice.loading);
  const nextPendingContext = contexts.find((item) =>
    item.contextId !== selectedId && !item.submitted && item.state === "OPEN");

  async function submit() {
    if (!complete || !context || submitting || selectedRef.current !== selectedId) return;
    setSubmitting(true);
    setError("");
    try {
      const saved = await clientApi<CoachBallot>(`${endpoint}/ballot`, {
        method: "POST",
        body: JSON.stringify({
          contextId: selectedId,
          votes: summary.map(({ category, candidate }) => ({
            voteCategoryId: category.id, candidateId: candidate.id,
          })),
        }),
      });
      // Do not turn a successful ballot into a visible error if a follow-up GET fails.
      // The POST response is the authoritative receipt and the server prevents resubmission.
      setReceipt(saved);
      setContext((current) => current ? { ...current, submitted: true, state: "SUBMITTED" } : current);
      setContexts((current) => current.map((item) => item.contextId === selectedId
        ? { ...item, submitted: true, state: "SUBMITTED" } : item));
      setConfirm(false);
      setNotice("Voto registrado definitivamente. Você pode consultar o comprovante abaixo.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível registrar seu voto.");
      setConfirm(false);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="flex min-h-80 items-center justify-center"><LoaderCircle className="size-9 animate-spin text-cyan" /></div>;

  return <div className="grid gap-6">
    <header>
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-amber"><Trophy className="size-5" />Júri técnico</div>
      <h1 className="display-title mt-3 text-3xl sm:text-4xl">Votação dos técnicos</h1>
      <p className="mt-2 text-sm text-muted">Você escolherá o goleiro, quatro jogadores de linha e o melhor treinador. Cada categoria possui um voto definitivo.</p>
    </header>

    {notice && <p role="status" className="rounded-xl border border-cyan/20 bg-cyan/7 p-4 text-sm text-cyan">{notice}</p>}
    {error && <p role="alert" className="rounded-xl border border-coral/25 bg-coral/8 p-4 text-sm text-[#ffb195]">{error}</p>}

    {!contexts.length ? <section className="rounded-3xl border border-white/10 bg-panel p-6">
      <ClipboardCheck className="size-9 text-amber" />
      <h2 className="mt-4 text-xl font-black">Nenhuma categoria habilitada</h2>
      <p className="mt-2 text-sm text-muted">Não há categoria ativa vinculada ao seu credenciamento. Entre em contato com a organização caso seu vínculo já tenha sido realizado.</p>
    </section> : <>
      <section className="rounded-3xl border border-white/10 bg-panel p-5">
        <h2 className="text-lg font-black">Escolha a categoria em que deseja votar</h2>
        <p className="mt-2 text-sm text-muted">Cada categoria autorizada possui uma votação independente. Você pode alternar entre elas antes ou depois de votar.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {contexts.map((item) => (
            <button key={item.contextId} type="button" disabled={submitting}
              aria-pressed={selectedId === item.contextId}
              onClick={() => void openContext(item.contextId)}
              className={`rounded-xl border p-4 text-left transition-colors ${selectedId === item.contextId
                ? "border-cyan bg-cyan/10" : "border-white/10 bg-night/40 hover:border-cyan/40"}`}>
              <span className="block text-sm font-black">{competitionLabel(item)}</span>
              <span className="mt-1 block text-xs text-muted">{item.gender === "FEMALE" ? "Feminino" : item.gender === "MALE" ? "Masculino" : "Modalidade não identificada"} • {item.teamName}</span>
              <span className={`mt-2 block text-xs font-black ${item.submitted ? "text-cyan" : "text-amber"}`}>
                {item.submitted ? "VOTO REGISTRADO" : item.state === "OPEN" ? "DISPONÍVEL PARA VOTAR" : item.state === "SCHEDULED" ? "AGENDADA" : "INDISPONÍVEL"}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">{contexts.filter((item) => !item.submitted).length} categoria(s) ainda sem voto.</p>
      </section>

      {contextLoading ? <div className="flex min-h-40 items-center justify-center"><LoaderCircle className="size-8 animate-spin text-cyan" /></div>
        : context && <>
          {(context.submitted || context.state === "SUBMITTED") ? <section className="rounded-3xl border border-cyan/20 bg-panel p-6">
            <CheckCircle2 className="size-9 text-cyan" />
            <h2 className="mt-3 text-xl font-black">Voto confirmado</h2>
            {receipt ? <>
              <p className="mt-2 text-sm text-muted">Registrado em {formatDate(receipt.submittedAt, { dateStyle: "short", timeStyle: "short" })}</p>
              <ul className="mt-4 grid gap-2">{orderedCoachBallotVotes(receipt.votes).map((vote) => <li key={vote.voteCategoryId} className="flex justify-between gap-4 rounded-xl bg-night/50 p-3 text-sm">
                <span className="text-muted">{slotLabels[vote.voteCategoryId] ?? vote.voteCategoryLabel}</span><strong>{vote.candidateName}</strong>
              </li>)}</ul>
            </> : <p className="mt-2 text-sm text-muted">Seu voto já foi contabilizado. Selecione outra categoria para continuar.</p>}
            {nextPendingContext ? <button type="button" className="btn-primary mt-5" disabled={submitting}
              onClick={() => void openContext(nextPendingContext.contextId)}>
              Votar na próxima categoria: {competitionLabel(nextPendingContext)}
            </button> : null}
          </section> : context.state !== "OPEN" ? <section className="rounded-3xl border border-white/10 bg-panel p-6">
            <h2 className="text-xl font-black">{context.state === "SCHEDULED" ? "Votação agendada" : context.state === "DRAFT" ? "Votação em preparação" : "Votação encerrada"}</h2>
            <p className="mt-2 text-sm text-muted">{context.state === "SCHEDULED" && context.votingOpensAt
              ? `Abertura prevista para ${formatDate(context.votingOpensAt, { dateStyle: "short", timeStyle: "short" })}.`
              : "Ainda não é possível registrar um voto nesta categoria."}</p>
          </section> : <>
            <div className="grid gap-5">{orderedVoteCategories(context.voteCategories).map((category) => {
              const choice = choices[category.id];
              const options = (context.teams as GoldTeam[]).filter((team) =>
                category.targetType === "ATHLETE" ? team.athleteEligible === true
                  : team.id !== context.representedTeamId,
              );
              return <section key={category.id} className="rounded-3xl border border-white/10 bg-panel p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black">{voteCategoryLabel(category, slotLabels)}</h2>{category.required && <span className="text-xs font-bold text-amber">Obrigatório</span>}</div>
                <div className={`mt-4 grid gap-4 ${category.targetType === "ATHLETE" ? "sm:grid-cols-2" : ""}`}>
                  <label className="grid gap-2 text-sm font-bold">Equipe
                    <select className="field" value={choice?.teamId ?? ""} onChange={(event) => void chooseTeam(category, event.target.value)}>
                      <option value="">Selecione uma equipe</option>
                      {options.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
                    </select>
                  </label>
                  {category.targetType === "ATHLETE" && <label className="grid gap-2 text-sm font-bold">Atleta
                    <select className="field" disabled={!choice?.teamId || choice.loading} value={choice?.candidateId ?? ""}
                      onChange={(event) => update(category.id, { candidateId: event.target.value })}>
                      <option value="">{choice?.loading ? "Carregando..." : "Selecione um atleta"}</option>
                      {(choice?.candidates ?? []).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}
                    </select>
                  </label>}
                </div>
                {category.targetType === "ATHLETE" ? <p className="mt-3 text-xs text-muted">Somente atletas de equipes da Chave Ouro são elegíveis.</p>
                  : <p className="mt-3 flex gap-2 text-xs text-muted"><ShieldCheck className="size-4 shrink-0 text-cyan" />Você não pode votar na própria equipe para o prêmio de Técnico.</p>}
                {category.targetType === "ATHLETE" && !options.length && <p className="mt-2 text-xs text-amber">Nenhuma equipe da Chave Ouro preparada para esta categoria.</p>}
              </section>;
            })}</div>
            <div className="flex justify-end"><button className="btn-primary w-full sm:w-auto" type="button" disabled={!complete || submitting} onClick={() => setConfirm(true)}>Revisar e registrar voto</button></div>
          </>}
        </>}
    </>}

    {confirm && context && <div role="presentation" className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center">
      <div role="dialog" aria-modal="true" aria-labelledby="coach-vote-confirm-title" className="w-full max-w-xl rounded-3xl border border-white/10 bg-panel p-6">
        <div className="flex items-start justify-between gap-4"><h2 id="coach-vote-confirm-title" className="display-title text-2xl">Confirme os votos</h2>
          <button className="btn-ghost" type="button" onClick={() => setConfirm(false)} disabled={submitting} aria-label="Fechar confirmação"><X className="size-5" /></button></div>
        <p className="mt-3 text-sm text-amber">Depois de confirmar, os votos desta categoria não poderão ser alterados.</p>
        <div className="mt-5 grid gap-2">{summary.map(({ category, candidate }) => <div key={category.id} className="flex justify-between gap-4 rounded-xl bg-night/40 p-3 text-sm">
          <span className="text-muted">{voteCategoryLabel(category, slotLabels)}</span><strong>{category.targetType === "COACH" ? candidate.teamName : candidate.name}</strong>
        </div>)}</div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button type="button" className="btn-ghost" onClick={() => setConfirm(false)} disabled={submitting}>Revisar escolhas</button>
          <button type="button" className="btn-primary" onClick={() => void submit()} disabled={!complete || submitting}>
            {submitting ? <LoaderCircle className="size-5 animate-spin" /> : <CheckCircle2 className="size-5" />}{submitting ? "Registrando..." : "Confirmar definitivamente"}
          </button>
        </div>
      </div>
    </div>}
  </div>;
}
