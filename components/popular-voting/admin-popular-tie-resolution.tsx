/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, LoaderCircle, Save, Users } from "lucide-react";
import { clientApi } from "@/lib/client-api";
import { votingParams } from "@/lib/popular-voting-types";
import type { VotingContext, VotingReadiness } from "@/lib/popular-voting-types";

type TieCandidate = {
  entryId: string;
  athleteName: string;
  teamName: string;
  average: number;
  compulsory: boolean;
  eligible: boolean;
};

type TieReview = {
  tiedAtCutoff: boolean;
  published: boolean;
  decidedCount: number | null;
  selectedEntryIds: string[];
  candidates: TieCandidate[];
};

type Props = {
  editionId: string;
  context: VotingContext;
  readiness: VotingReadiness;
  onResolved: () => Promise<void>;
};

export function AdminPopularTieResolution({ editionId, context, readiness, onResolved }: Props) {
  const [review, setReview] = useState<TieReview | null>(null);
  const [count, setCount] = useState<3 | 4 | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    setReview(null);
    setCount(null);
    setChosen([]);
    setLoading(true);
    setError("");
    setNotice("");
    clientApi<TieReview>(
      `/api/admin/awards/editions/${editionId}/pre-vote/tie-review?${votingParams(context)}`,
      { cache: "no-store" },
    ).then((result) => {
      if (!active) return;
      setReview(result);
      setCount(result.decidedCount === 3 || result.decidedCount === 4 ? result.decidedCount : null);
      setChosen(result.selectedEntryIds);
    }).catch((reason: unknown) => {
      if (!active) return;
      setError(reason instanceof Error ? reason.message : "Não foi possível consultar o desempate.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [editionId, context]);

  const hasPendingPrerequisites = readiness.blockers.some((blocker) =>
    ["INSCRICOES_ABERTAS", "REVISOES_PENDENTES", "NOTAS_PENDENTES", "NENHUM_ADMIN_ATIVO"].includes(blocker));
  const isTieBlocker = readiness.blockers.includes("EMPATE_NO_CORTE_TOP3") ||
    readiness.blockers.includes("DECISAO_DE_EMPATE_INVALIDA");

  function chooseCount(next: 3 | 4) {
    if (!review) return;
    const fixed = review.candidates.filter((candidate) => candidate.compulsory).map((candidate) => candidate.entryId);
    const tied = review.candidates.filter((candidate) => candidate.eligible && !candidate.compulsory);
    const vacancies = next - fixed.length;
    const automatic = tied.length === vacancies ? tied.map((candidate) => candidate.entryId) : [];
    setCount(next);
    setChosen([...fixed, ...automatic]);
    setNotice("");
  }

  function toggleCandidate(entryId: string) {
    if (!review || count === null || saving) return;
    const athlete = review.candidates.find((candidate) => candidate.entryId === entryId);
    if (!athlete?.eligible || athlete.compulsory) return;
    setChosen((previous) => previous.includes(entryId)
      ? previous.filter((item) => item !== entryId)
      : previous.length < count ? [...previous, entryId] : previous);
  }

  async function saveDecision() {
    if (!review || count === null || chosen.length !== count || saving) return;
    if (!window.confirm(`Confirmar ${count} finalistas para esta disputa? A escolha poderá ser alterada até a publicação.`)) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const updated = await clientApi<TieReview>(
        `/api/admin/awards/editions/${editionId}/pre-vote/tie-decision`, {
          method: "POST",
          body: JSON.stringify({
            context: {
              eventId: context.eventId,
              divisionId: context.divisionId,
              categoryId: context.categoryId,
              gender: context.gender,
              contestCategory: context.contestCategory,
            },
            finalistCount: count,
            selectedEntryIds: chosen,
          }),
        },
      );
      setReview(updated);
      setChosen(updated.selectedEntryIds);
      setCount(updated.decidedCount === 3 || updated.decidedCount === 4 ? updated.decidedCount : null);
      setNotice(`Decisão registrada: ${count} finalistas. A validação do agendamento foi atualizada.`);
      await onResolved();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Falha ao salvar a decisão do empate.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <section className="surface rounded-3xl p-5" role="status">
    <LoaderCircle className="mr-2 inline size-4 animate-spin" /> Conferindo desempate desta disputa…
  </section>;
  if (error && !review) return <section className="surface rounded-3xl border border-coral/30 p-5" role="alert">
    <p className="text-sm text-coral">Não foi possível carregar a decisão de empate: {error}</p>
    <p className="mt-2 text-xs text-muted">Confira se o backend atualizado e a migração V34 foram publicados.</p>
  </section>;
  if (!review?.tiedAtCutoff) {
    if (!hasPendingPrerequisites && !isTieBlocker) return null;
    return <section className="surface rounded-3xl p-5 sm:p-6">
      <h3 className="text-lg font-black">Conferência do empate</h3>
      <p className="mt-2 text-sm text-muted">{hasPendingPrerequisites
        ? "A decisão entre 3 ou 4 finalistas será liberada após o encerramento das inscrições, aprovação dos vídeos e notas de todos os administradores."
        : "O agendamento detectou um empate, mas a pré-votação ainda não apresentou candidatos elegíveis. Atualize as notas e confira a classificação."}</p>
    </section>;
  }

  const selectable = review.candidates.filter((candidate) => candidate.eligible);
  return <section className="surface space-y-4 rounded-3xl border border-amber/30 p-5 sm:p-7">
    <div className="flex items-center gap-2">
      <Users className="size-5 text-amber" />
      <h3 className="text-xl font-black">Desempate: escolha os finalistas</h3>
    </div>
    <p className="text-sm text-muted">Existe empate na nota de corte para esta disputa. Escolha se a votação popular terá 3 ou 4 finalistas. Atletas acima da nota de corte são obrigatórios; as demais vagas são preenchidas pelos empatados.</p>
    {review.decidedCount && <p className="flex items-center gap-2 text-sm text-cyan">
      <CheckCircle2 className="size-4" /> Decisão salva: {review.decidedCount} finalistas.
    </p>}
    <div className="flex flex-wrap gap-3">
      <button type="button" className={count === 4 ? "btn-primary" : "btn-ghost"}
        disabled={saving || selectable.length < 4} onClick={() => chooseCount(4)}>Seguir com 4 finalistas</button>
      <button type="button" className={count === 3 ? "btn-primary" : "btn-ghost"}
        disabled={saving} onClick={() => chooseCount(3)}>Seguir com 3 finalistas</button>
    </div>
    {count !== null && <>
      <p className="text-sm text-muted">Selecionados: {chosen.length} de {count}. Marque os atletas empatados que devem participar.</p>
      <div className="grid gap-3 md:grid-cols-2">
        {selectable.map((candidate) => <label key={candidate.entryId}
          className="flex items-start gap-3 rounded-xl border border-white/15 p-4">
          <input type="checkbox" className="mt-1 size-4" checked={chosen.includes(candidate.entryId)}
            disabled={saving || candidate.compulsory} onChange={() => toggleCandidate(candidate.entryId)} />
          <span className="grid gap-1 text-sm">
            <strong>{candidate.athleteName}</strong>
            <span className="text-muted">{candidate.teamName} · Média {candidate.average.toFixed(2)}</span>
            {candidate.compulsory && <span className="text-xs text-cyan">Classificado por média superior</span>}
          </span>
        </label>)}
      </div>
      <button type="button" className="btn-primary" disabled={saving || chosen.length !== count}
        onClick={() => void saveDecision()}>
        {saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
        Salvar decisão e atualizar agendamento
      </button>
    </>}
    {error && <p role="alert" className="text-sm text-coral">{error}</p>}
    {notice && <p role="status" className="text-sm text-cyan">{notice}</p>}
  </section>;
}
