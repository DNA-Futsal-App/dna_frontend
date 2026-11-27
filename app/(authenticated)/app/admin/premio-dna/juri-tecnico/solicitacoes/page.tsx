"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clientApi, formatDate } from "@/lib/client-api";
import type { AdminAwardEdition } from "@/lib/admin-awards-types";
import { useCoachCompetitionLabels } from "@/lib/use-coach-competition-labels";

type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED" | "REVOKED";
type Application = {
  id: string;
  editionId: string;
  coachName: string;
  email: string;
  eventId: number;
  divisionId: number;
  categoryId: number;
  gender: "MALE" | "FEMALE";
  teamName: string;
  coachRole: string;
  status: ReviewStatus;
  reviewReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

export default function TechnicalJuryApplicationsPage() {
  const [editions, setEditions] = useState<AdminAwardEdition[]>([]);
  const [editionId, setEditionId] = useState("");
  const [filter, setFilter] = useState<"ALL" | ReviewStatus>("ALL");
  const [applications, setApplications] = useState<Application[]>([]);
  const competitionLabel = useCoachCompetitionLabels(applications.map((item) => ({
    ...item,
    season: editions.find((edition) => edition.id === item.editionId)?.season ?? 0,
  })));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [allowExpired, setAllowExpired] = useState(false);
  const [allowRevoked, setAllowRevoked] = useState(false);
  const [results, setResults] = useState<Record<string, { status: string; detail: string }>>({});
  const pending = applications.filter(a => a.status === "PENDING");

  async function reconcile(items: Application[], dryRun: boolean) {
    if (!items.length || busy) return;
    const expired = allowExpired;
    const revoked = allowRevoked;
    if (!dryRun && !window.confirm(
      `Regularizar ${items.length} vínculo(s) pendente(s)? ` +
      (expired ? "Você confirma que conferiu os vínculos com convites expirados? " : "") +
      (revoked ? "Você confirma que conferiu os vínculos associados a convites revogados? Os links permanecerão revogados. " : "") +
      "Nenhum voto existente será apagado.")) return;
    setBusy(true);
    setError("");
    try {
      // Each request is an independent transaction. Do not abort remaining items on a conflict.
      for (const a of items) {
        try {
          const result = await clientApi<{ status: string; detail: string }>(
            `/api/admin/awards/editions/${a.editionId}/coach-category-applications/${a.id}/reconcile`,
            { method: "POST", body: JSON.stringify({ dryRun, allowExpired: expired, allowRevoked: revoked }) },
          );
          setResults(previous => ({ ...previous, [a.id]: result }));
        } catch (e) {
          setResults(previous => ({ ...previous, [a.id]: {
            status: "BLOCKED", detail: e instanceof Error ? e.message : "Não foi possível regularizar o vínculo.",
          } }));
        }
      }
    } finally {
      if (!dryRun) {
        setLoading(true);
        setApplications([]);
        setRevision(previous => previous + 1);
      }
      setBusy(false);
    }
  }

  useEffect(() => {
    let active = true;
    clientApi<AdminAwardEdition[]>("/api/admin/awards/editions")
      .then((data) => {
        if (!active) return;
        setEditions(data);
        setEditionId(data[0]?.id ?? "");
        // Keep loading until the applications request completes.
        if (!data.length) setLoading(false);
      })
      .catch((e) => {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Não foi possível carregar as edições.");
        setLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!editionId) return;
    let active = true;
    const query = filter === "ALL" ? "" : `?status=${filter}`;
    clientApi<Application[]>(`/api/admin/awards/editions/${editionId}/coach-category-applications${query}`, { cache: "no-store" })
      .then((result) => { if (active) setApplications(result); })
      .catch((e) => { if (active) setError(e instanceof Error ? e.message : "Erro ao consultar solicitações."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [editionId, filter, revision]);

  return <main className="grid gap-6">
    <header>
      <Link className="text-sm font-bold text-cyan" href="/app/admin/premio-dna/juri-tecnico/links-por-categoria">Voltar aos convites</Link>
      <h1 className="display-title mt-3 text-3xl">Credenciamentos do júri técnico</h1>
      <p className="mt-2 text-sm text-muted">Consulte os vínculos e regularize solicitações antigas. Novos convites continuam automáticos, sem aprovação manual.</p>
    </header>
    {error ? <p role="alert" className="rounded-xl border border-coral/25 p-4 text-sm text-[#ffb195]">{error}</p> : null}
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="grid gap-2 text-sm font-bold">Edição
        <select className="field" value={editionId} disabled={busy} onChange={(e) => {
          if (e.target.value === editionId) return;
          setLoading(true);
          setError("");
          setResults({});
          setAllowExpired(false);
          setAllowRevoked(false);
          setApplications([]);
          setEditionId(e.target.value);
        }}>
          {editions.map(e => <option value={e.id} key={e.id}>{e.name}</option>)}
        </select>
      </label>
      <label className="grid gap-2 text-sm font-bold">Situação
        <select className="field" value={filter} disabled={busy || !editionId} onChange={(e) => {
          const next = e.target.value as "ALL" | ReviewStatus;
          if (next === filter) return;
          setLoading(true);
          setError("");
          setApplications([]);
          setFilter(next);
        }}>
          <option value="ALL">Todos</option>
          <option value="APPROVED">Credenciamento aprovado</option>
          <option value="PENDING">Pendentes antigos</option>
          <option value="REJECTED">Recusados antigos</option>
          <option value="REVOKED">Revogados</option>
        </select>
      </label>
    </div>
    <section className="grid gap-3 rounded-2xl border border-white/10 bg-panel p-4">
      <h2 className="font-bold">Regularização de pendências antigas</h2>
      <p className="text-sm text-muted">{pending.length} pendente(s) na lista atual. Simule antes de executar. Contas inativas, credenciais ou contextos desativados, credenciamentos revogados e conflitos não serão liberados.</p>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={allowExpired} disabled={busy} onChange={e => { setAllowExpired(e.target.checked); setResults({}); }} />
        Permitir convites expirados após conferência administrativa (não revogados)
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={allowRevoked} disabled={busy} onChange={e => { setAllowRevoked(e.target.checked); setResults({}); }} />
        Regularizar pedidos pendentes de convites revogados após conferir os vínculos (inclusive expirados)
      </label>
      {allowRevoked && <p className="text-xs text-amber">Esta opção não reativa o link nem credenciamentos revogados. Confira cada treinador antes de executar.</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-ghost" disabled={busy || loading || !pending.length} onClick={() => void reconcile(pending, true)}>Simular pendentes</button>
        <button type="button" className="btn-primary" disabled={busy || loading || !pending.some(a => results[a.id]?.status === "READY")} onClick={() => void reconcile(pending.filter(a => results[a.id]?.status === "READY"), false)}>Regularizar aptos</button>
      </div>
      {busy && <p role="status" className="text-sm text-muted">Processando credenciamentos…</p>}
      {Object.keys(results).length > 0 && <p role="status" className="text-sm text-muted">
        {Object.values(results).filter(r => r.status === "READY").length} aptos · {Object.values(results).filter(r => r.status === "RECONCILED" || r.status === "ALREADY_APPROVED").length} regularizados · {Object.values(results).filter(r => r.status === "BLOCKED").length} bloqueados
      </p>}
    </section>
    {loading ? <p className="text-sm text-muted">Carregando...</p> : null}
    {!loading && !applications.length ? <p className="text-sm text-muted">Nenhuma solicitação encontrada.</p> : null}
    <div className="grid gap-4">
      {applications.map(a => <article key={a.id} className="grid gap-4 rounded-2xl border border-white/10 bg-panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">{a.coachName}</h2>
            <p className="text-xs text-muted">{a.email} • Solicitado em {formatDate(a.createdAt)}</p>
          </div>
          <span className={`text-xs font-black ${a.status === "PENDING" ? "text-amber" : "text-cyan"}`}>
            {a.status === "APPROVED" ? "CREDENCIAMENTO APROVADO" : a.status === "PENDING" ? "CREDENCIAMENTO PENDENTE" : a.status}
          </span>
        </div>
        <div className="grid gap-1 text-sm text-muted">
          <p><strong>Equipe:</strong> {a.teamName}</p>
          <p><strong>Função informada:</strong> {a.coachRole}</p>
          <p><strong>Modalidade:</strong> {a.gender === "MALE" ? "Masculino" : "Feminino"} • {competitionLabel({ ...a, season: editions.find((edition) => edition.id === a.editionId)?.season ?? 0 })}</p>
          {a.reviewReason && <p><strong>Observação:</strong> {a.reviewReason}</p>}
        </div>
        {results[a.id] && <p role="status" className="text-sm text-muted">{results[a.id].detail}</p>}
        {a.status === "PENDING" && <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-ghost" disabled={busy || loading} onClick={() => void reconcile([a], true)}>Simular</button>
          <button type="button" className="btn-primary" disabled={busy || loading || results[a.id]?.status !== "READY"} onClick={() => void reconcile([a], false)}>Regularizar vínculo</button>
        </div>}
      </article>)}
    </div>
  </main>;
}
