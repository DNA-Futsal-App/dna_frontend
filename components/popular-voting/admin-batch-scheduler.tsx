/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, CircleAlert, Layers3, LoaderCircle, Users } from "lucide-react";
import { clientApi } from "@/lib/client-api";
import type { ContestCategory, Gender, VotingContext, VotingReadiness, VotingStatus } from "@/lib/popular-voting-types";
import { votingStatusLabel } from "@/lib/popular-voting-types";

type BatchSelection = {
  eventId: number;
  divisionId: number;
  categoryId: number;
  gender: Gender | null; // null = both genders
  contestCategory: ContestCategory | null; // null = all four award modalities
};
type BatchItem = {
  context: VotingReadiness["context"];
  status: VotingStatus;
  readiness: VotingReadiness;
};
type BatchReport = { selection: BatchSelection; ready: boolean; items: BatchItem[] };

const prizes: Record<ContestCategory, string> = {
  BEAUTIFUL_GOAL: "Gol mais bonito",
  BEST_DRIBBLE: "Melhor drible",
  FREE_KICK_GOAL: "Gol de falta mais bonito",
  BEST_SAVE: "Melhor defesa",
};
const blockers: Record<string, string> = {
  INSCRICOES_ABERTAS: "Inscrições ainda abertas",
  REVISOES_PENDENTES: "Vídeos aguardando análise",
  MENOS_DE_TRES_VIDEOS_APROVADOS: "Menos de 3 vídeos aprovados",
  NENHUM_ADMIN_ATIVO: "Nenhum administrador ativo",
  NOTAS_PENDENTES: "Avaliações de administradores pendentes",
  EMPATE_NO_CORTE_TOP3: "Empate na terceira colocação",
};

function distinct<T extends string | number>(values: T[]): T[] {
  return [...new Set(values)];
}
function keyFor(item: VotingContext) {
  return `${item.eventId}|${item.divisionId}|${item.categoryId}`;
}

export function AdminBatchScheduler({ editionId, contexts, onScheduled }: {
  editionId: string;
  contexts: VotingContext[];
  onScheduled?: () => void;
}) {
  const [base, setBase] = useState("");
  const [gender, setGender] = useState<Gender | "ALL">("MALE");
  const [contestCategory, setContestCategory] = useState<ContestCategory | "ALL">("ALL");
  const [opensAt, setOpensAt] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [report, setReport] = useState<BatchReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const uniqueBases = useMemo(() => {
    const seen = new Map<string, VotingContext>();
    for (const item of contexts) if (!seen.has(keyFor(item))) seen.set(keyFor(item), item);
    return [...seen.values()];
  }, [contexts]);

  useEffect(() => {
    setBase(uniqueBases[0] ? keyFor(uniqueBases[0]) : "");
    setGender(uniqueBases[0]?.gender ?? "MALE");
    setContestCategory("ALL");
    setReport(null);
    setError("");
    setNotice("");
  }, [editionId, uniqueBases]);

  const selected = uniqueBases.find((item) => keyFor(item) === base);
  const selection: BatchSelection | null = selected ? {
    eventId: selected.eventId,
    divisionId: selected.divisionId,
    categoryId: selected.categoryId,
    gender: gender === "ALL" ? null : gender,
    contestCategory: contestCategory === "ALL" ? null : contestCategory,
  } : null;
  const params = selection ? new URLSearchParams({
    eventId: String(selection.eventId), divisionId: String(selection.divisionId),
    categoryId: String(selection.categoryId),
    ...(selection.gender ? { gender: selection.gender } : {}),
    ...(selection.contestCategory ? { contestCategory: selection.contestCategory } : {}),
  }).toString() : "";

  useEffect(() => {
    if (!params || !editionId) { setReport(null); return; }
    let active = true;
    setLoading(true);
    setReport(null);
    setError("");
    clientApi<BatchReport>(`/api/admin/awards/editions/${editionId}/popular-voting/batch/readiness?${params}`)
      .then((value) => { if (active) setReport(value); })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : "Falha ao conferir avaliações."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [editionId, params]);

  async function refresh() {
    if (!params) return;
    setReport(await clientApi<BatchReport>(
      `/api/admin/awards/editions/${editionId}/popular-voting/batch/readiness?${params}`));
  }

  async function schedule() {
    if (!selection || !opensAt || !closesAt) {
      setError("Informe as datas de abertura e encerramento.");
      return;
    }
    const open = new Date(opensAt), close = new Date(closesAt);
    if (!Number.isFinite(open.getTime()) || !Number.isFinite(close.getTime()) ||
      open.getTime() <= Date.now() || close.getTime() <= open.getTime()) {
      setError("A abertura deve ser futura, e o encerramento posterior à abertura.");
      return;
    }
    const count = report?.items.length ?? (contestCategory === "ALL" ? 4 : 1) * (gender === "ALL" ? 2 : 1);
    if (!window.confirm(`Programar ${count} disputa(s) em uma única operação? Se alguma tiver pendências, nenhuma será programada.`)) return;
    setBusy(true);
    setError(""); setNotice("");
    try {
      const result = await clientApi<unknown[]>(`/api/admin/awards/editions/${editionId}/popular-voting/batch`, {
        method: "POST", body: JSON.stringify({ selection, opensAt: open.toISOString(), closesAt: close.toISOString() }),
      });
      await refresh();
      setNotice(`${result.length} disputa(s) programada(s). As outras divisões e categorias não foram alteradas.`);
      onScheduled?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível agendar as disputas.");
      try {
        await refresh();
      }
      catch { /* Preserve the original error. */ }
    } finally { setBusy(false); }
  }

  return <section className="surface space-y-5 rounded-3xl p-5 sm:p-7">
    <header>
      <p className="eyebrow"><Layers3 className="size-4" /> Programação por categoria de base</p>
      <h2 className="mt-3 text-2xl font-black">Programe as votações</h2>
      <p className="mt-2 max-w-3xl text-sm text-muted">Escolha o campeonato, a divisão e a categoria de base. Programe todas as quatro modalidades do prêmio juntas, ou apenas uma. Você também pode limitar a um gênero ou incluir os dois.</p>
    </header>
    <div className="grid gap-4 md:grid-cols-3">
      <label className="grid gap-2 text-sm font-bold">Campeonato / divisão / categoria
        <select className="field" value={base} disabled={busy} onChange={(e) => { setBase(e.target.value); setNotice(""); }}>
          {uniqueBases.map((item) => <option key={keyFor(item)} value={keyFor(item)}>
            Evento #{item.eventId} · {item.divisionName} · {item.categoryName}
          </option>)}
        </select>
      </label>
      <label className="grid gap-2 text-sm font-bold">Gênero
        <select className="field" value={gender} disabled={busy} onChange={(e) => setGender(e.target.value as Gender | "ALL")}>
          <option value="MALE">Masculino</option><option value="FEMALE">Feminino</option>
          <option value="ALL">Masculino + feminino</option>
        </select>
      </label>
      <label className="grid gap-2 text-sm font-bold">Modalidades do prêmio
        <select className="field" value={contestCategory} disabled={busy} onChange={(e) => setContestCategory(e.target.value as ContestCategory | "ALL")}>
          <option value="ALL">Todas as 4 modalidades</option>
          {Object.entries(prizes).map(([code, label]) => <option value={code} key={code}>{label}</option>)}
        </select>
      </label>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="grid gap-2 text-sm font-bold">Abertura da votação
        <input className="field" type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} disabled={busy} />
      </label>
      <label className="grid gap-2 text-sm font-bold">Encerramento da votação
        <input className="field" type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} disabled={busy} />
      </label>
    </div>
    <p className="text-xs text-muted">Horários inseridos no fuso do navegador. A API recebe instantes UTC. A operação é atômica: se uma modalidade tiver pendências, nenhuma das selecionadas é aberta.</p>
    {loading && <p className="flex items-center gap-2 text-sm text-muted"><LoaderCircle className="size-4 animate-spin" /> Verificando notas de todos os administradores…</p>}
    {report && <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <strong className="text-sm">Verificação: {report.items.length} disputa(s)</strong>
        <span className={`text-xs font-bold ${report.ready ? "text-cyan" : "text-amber"}`}>
          {report.ready ? "Todas aptas a agendar" : "Existem bloqueios — confira abaixo"}
        </span>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">{report.items.map((item) => <article key={`${item.context.gender}|${item.context.contestCategory}`} className="rounded-2xl border border-white/15 bg-night/50 p-4">
        <div className="flex items-start justify-between gap-2">
          <div><h3 className="text-sm font-black">{prizes[item.context.contestCategory]}</h3>
            <p className="mt-1 text-xs text-muted">{item.context.gender === "MALE" ? "Masculino" : "Feminino"} · {item.readiness.approvedVideos} vídeos aprovados</p></div>
          {item.status !== "NOT_SCHEDULED" ? <span className="text-xs font-bold text-amber">{votingStatusLabel(item.status)}</span> :
            item.readiness.ready ? <span className="flex items-center gap-1 text-xs font-bold text-cyan"><CheckCircle2 className="size-4" /> Apta</span> :
              <span className="flex items-center gap-1 text-xs font-bold text-amber"><CircleAlert className="size-4" /> Pendente</span>}
        </div>
        {item.readiness.blockers.length > 0 && <ul className="mt-3 space-y-1 text-xs text-amber">
          {item.readiness.blockers.map((blocker) => <li key={blocker}>• {blockers[blocker] ?? blocker}</li>)}
        </ul>}
        {item.readiness.missingAdmins.length > 0 && <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
          {item.readiness.missingAdmins.map((admin) => <div key={admin.adminId}>
            <p className="flex items-center gap-2 text-xs font-bold"><Users className="size-3 text-amber" />{admin.adminName} · {admin.missingVideos.length} pendência(s)</p>
            <p className="mt-1 text-xs text-muted">{admin.missingVideos.map((video) => `${video.athleteName} (#${video.registrationNumber})`).join(" · ")}</p>
          </div>)}
        </div>}
      </article>)}</div>
    </div>}
    {error && <p role="alert" className="rounded-xl border border-coral/40 p-3 text-sm text-coral">{error}</p>}
    {notice && <p role="status" className="rounded-xl border border-cyan/30 p-3 text-sm text-cyan">{notice}</p>}
    <button type="button" className="btn-primary" disabled={busy || loading || !selection || !report || !opensAt || !closesAt} onClick={() => void schedule()}>
      {busy ? <LoaderCircle className="size-4 animate-spin" /> : <CalendarClock className="size-4" />}
      {contestCategory === "ALL" ? "Validar e programar todas as modalidades" : "Validar e programar esta modalidade"}
    </button>
  </section>;
}
