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

  useEffect(() => {
    clientApi<AdminAwardEdition[]>("/api/admin/awards/editions")
      .then((data) => { setEditions(data); setEditionId(data[0]?.id ?? ""); })
      .catch((e) => setError(e instanceof Error ? e.message : "Não foi possível carregar as edições."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!editionId) return;
    let active = true;
    const query = filter === "ALL" ? "" : `?status=${filter}`;
    clientApi<Application[]>(`/api/admin/awards/editions/${editionId}/coach-category-applications${query}`)
      .then((result) => { if (active) setApplications(result); })
      .catch((e) => { if (active) setError(e instanceof Error ? e.message : "Erro ao consultar solicitações."); });
    return () => { active = false; };
  }, [editionId, filter]);

  return <main className="grid gap-6">
    <header>
      <Link className="text-sm font-bold text-cyan" href="/app/admin/premio-dna/juri-tecnico/links-por-categoria">Voltar aos convites</Link>
      <h1 className="display-title mt-3 text-3xl">Técnicos credenciados</h1>
      <p className="mt-2 text-sm text-muted">Consulta de vínculos gerados automaticamente pelos convites. A revogação continua disponível no gerenciamento de técnicos.</p>
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
          <option value="ALL">Todos</option>
          <option value="APPROVED">Acesso ativo</option>
          <option value="PENDING">Pendentes antigos</option>
          <option value="REJECTED">Recusados antigos</option>
          <option value="REVOKED">Revogados</option>
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
          <span className="text-xs font-black text-cyan">{a.status === "APPROVED" ? "ACESSO ATIVO" : a.status}</span>
        </div>
        <div className="grid gap-1 text-sm text-muted">
          <p><strong>Equipe:</strong> {a.teamName}</p>
          <p><strong>Função informada:</strong> {a.coachRole}</p>
          <p><strong>Modalidade:</strong> {a.gender === "MALE" ? "Masculino" : "Feminino"} • {competitionLabel({ ...a, season: editions.find((edition) => edition.id === a.editionId)?.season ?? 0 })}</p>
          {a.reviewReason && <p><strong>Observação:</strong> {a.reviewReason}</p>}
        </div>
      </article>)}
    </div>
  </main>;
}
