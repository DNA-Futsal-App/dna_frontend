"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { clientApi, formatDate } from "@/lib/client-api";
import type { AdminAwardEdition } from "@/lib/admin-awards-types";

type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";
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
  evidenceUrl: string | null;
  status: ReviewStatus;
  reviewReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

export default function TechnicalJuryApplicationsPage() {
  const [editions, setEditions] = useState<AdminAwardEdition[]>([]);
  const [editionId, setEditionId] = useState("");
  const [filter, setFilter] = useState<"ALL" | ReviewStatus>("PENDING");
  const [applications, setApplications] = useState<Application[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState<Record<string, string>>({});

  useEffect(() => {
    clientApi<AdminAwardEdition[]>("/api/admin/awards/editions")
      .then((data) => { setEditions(data); setEditionId(data[0]?.id ?? ""); })
      .catch((e) => setError(e instanceof Error ? e.message : "Não foi possível carregar as edições."))
      .finally(() => setLoading(false));
  }, []);

  const load = useCallback(async () => {
    if (!editionId) return;
    const query = filter === "ALL" ? "" : `?status=${filter}`;
    const result = await clientApi<Application[]>(
      `/api/admin/awards/editions/${editionId}/coach-category-applications${query}`,
    );
    setApplications(result);
  }, [editionId, filter]);

  useEffect(() => {
    if (!editionId) return;
    let active = true;
    const query = filter === "ALL" ? "" : `?status=${filter}`;
    clientApi<Application[]>(`/api/admin/awards/editions/${editionId}/coach-category-applications${query}`)
      .then((result) => { if (active) setApplications(result); })
      .catch((e) => { if (active) setError(e instanceof Error ? e.message : "Erro ao consultar solicitações."); });
    return () => { active = false; };
  }, [editionId, filter]);

  async function review(application: Application, decision: "approve" | "reject") {
    if (decision === "approve" && !window.confirm(`Confirma que ${application.coachName} é técnico do clube ${application.teamName}?`)) return;
    const detail = (reason[application.id] ?? "").trim();
    if (decision === "reject" && !detail) { setError("Informe o motivo da recusa."); return; }
    setBusy(application.id); setError("");
    try {
      await clientApi(`/api/admin/awards/editions/${editionId}/coach-category-applications/${application.id}/${decision}`, {
        method: "POST",
        ...(decision === "reject" ? { body: JSON.stringify({ reason: detail }) } : {}),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível analisar a solicitação.");
    } finally { setBusy(""); }
  }

  return <main className="grid gap-6">
    <header>
      <Link className="text-sm font-bold text-cyan" href="/app/admin/premio-dna/juri-tecnico/links-por-categoria">Voltar aos convites</Link>
      <h1 className="display-title mt-3 text-3xl">Solicitações de técnicos</h1>
      <p className="mt-2 text-sm text-muted">Confirme o vínculo do treinador com o clube antes de aprovar. O link por categoria não concede voto automaticamente.</p>
    </header>
    {error ? <p role="alert" className="rounded-xl border border-coral/25 p-4 text-sm text-[#ffb195]">{error}</p> : null}
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="grid gap-2 text-sm font-bold">Edição
        <select className="field" value={editionId} onChange={(e) => setEditionId(e.target.value)}>
          {editions.map(e => <option value={e.id} key={e.id}>{e.name}</option>)}
        </select>
      </label>
      <label className="grid gap-2 text-sm font-bold">Situação
        <select className="field" value={filter} onChange={(e) => setFilter(e.target.value as "ALL" | ReviewStatus)}>
          <option value="PENDING">Aguardando análise</option>
          <option value="APPROVED">Aprovados</option>
          <option value="REJECTED">Recusados</option>
          <option value="ALL">Todos</option>
        </select>
      </label>
    </div>
    {loading ? <p className="text-sm text-muted">Carregando...</p> : null}
    {!loading && !applications.length ? <p className="text-sm text-muted">Nenhuma solicitação encontrada.</p> : null}
    <div className="grid gap-4">
      {applications.map(a => <article key={a.id} className="grid gap-4 rounded-2xl border border-white/10 bg-panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">{a.coachName}</h2>
            <p className="text-xs text-muted">{a.email} • Solicitado em {formatDate(a.createdAt)}</p>
          </div>
          <span className="text-xs font-black text-cyan">{a.status === "PENDING" ? "AGUARDANDO" : a.status}</span>
        </div>
        <div className="grid gap-1 text-sm text-muted">
          <p><strong>Equipe:</strong> {a.teamName}</p>
          <p><strong>Função informada:</strong> {a.coachRole}</p>
          <p><strong>Modalidade:</strong> {a.gender === "MALE" ? "Masculino" : "Feminino"} • Evento {a.eventId} • Divisão {a.divisionId} • Categoria {a.categoryId}</p>
          {a.evidenceUrl && <a className="text-cyan underline" href={a.evidenceUrl} target="_blank" rel="noopener noreferrer">Abrir comprovante apresentado</a>}
          {a.reviewReason && <p><strong>Motivo da recusa:</strong> {a.reviewReason}</p>}
        </div>
        {a.status === "PENDING" && <div className="grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-2">
          <button className="btn-primary" disabled={Boolean(busy)} onClick={() => void review(a, "approve")}>Aprovar vínculo</button>
          <div className="grid gap-2">
            <input className="field" placeholder="Motivo da recusa" maxLength={500} value={reason[a.id] ?? ""} onChange={(e) => setReason(prev => ({ ...prev, [a.id]: e.target.value }))} />
            <button className="btn-ghost" disabled={Boolean(busy) || !(reason[a.id] ?? "").trim()} onClick={() => void review(a, "reject")}>Recusar</button>
          </div>
        </div>}
      </article>)}
    </div>
  </main>;
}
