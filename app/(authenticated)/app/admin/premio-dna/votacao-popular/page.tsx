"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarClock, LoaderCircle, ShieldCheck } from "lucide-react";
import { clientApi } from "@/lib/client-api";
import type { AdminAwardEdition } from "@/lib/admin-awards-types";
import type { VotingEdition } from "@/lib/popular-voting-types";

const label = (status: VotingEdition["status"]) => ({ NOT_SCHEDULED: "Não programada", SCHEDULED: "Programada", OPEN: "Em andamento", CLOSED: "Encerrada" })[status];

export default function AdminPopularVotingPage() {
  const [editions, setEditions] = useState<AdminAwardEdition[]>([]);
  const [editionId, setEditionId] = useState("");
  const [windowData, setWindowData] = useState<VotingEdition | null>(null);
  const [opensAt, setOpensAt] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    clientApi<AdminAwardEdition[]>("/api/admin/awards/editions")
      .then((result) => { if (active) { setEditions(result); setEditionId(result[0]?.id ?? ""); } })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : "Não foi possível carregar as edições."); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!editionId) return;
    let active = true;
    clientApi<VotingEdition>(`/api/admin/awards/editions/${editionId}/popular-voting/window`)
      .then((result) => { if (active) setWindowData(result); })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : "Não foi possível carregar a janela."); });
    return () => { active = false; };
  }, [editionId]);

  async function schedule() {
    if (!editionId || !opensAt || !closesAt) return;
    const opening = new Date(opensAt);
    const closing = new Date(closesAt);
    if (closing.getTime() <= opening.getTime() || closing.getTime() <= Date.now()) { setError("Informe um encerramento após a abertura e no futuro.");return; }
    if (!window.confirm("Programar a votação pública? A janela não poderá ser reaberta após o fechamento.")) return;
    setBusy(true); setError("");setNotice("");
    try {
      const result = await clientApi<VotingEdition>(`/api/admin/awards/editions/${editionId}/popular-voting/window`,
        { method: "POST", body: JSON.stringify({ opensAt: opening.toISOString(), closesAt: closing.toISOString() }) });
      setWindowData(result);
      setNotice("Votação popular programada com sucesso.");
    } catch (err) { setError(err instanceof Error ? err.message : "Erro ao programar."); } finally { setBusy(false); }
  }

  async function close() {
    if (!window.confirm("Encerrar a votação popular imediatamente? Essa decisão não poderá ser revertida.")) return;
    setBusy(true);setError("");setNotice("");
    try {
      const result = await clientApi<VotingEdition>(`/api/admin/awards/editions/${editionId}/popular-voting/close`, { method: "POST" });
      setWindowData(result);
      setNotice("Votação encerrada. A apuração está disponível na página pública.");
    } catch (err) { setError(err instanceof Error ? err.message : "Erro ao encerrar."); } finally { setBusy(false); }
  }

  return <div className="mx-auto max-w-3xl space-y-6">
    <Link href="/app/admin/premio-dna" className="text-sm font-bold text-muted hover:text-ivory">Voltar ao painel do prêmio</Link>
    <header><p className="eyebrow"><ShieldCheck className="size-4"/> Administração</p><h1 className="display-title mt-3 text-3xl">Votação popular</h1><p className="mt-3 text-sm text-muted">Controle independente da votação dos técnicos. Apenas os grupos com três finalistas publicados ficam disponíveis ao público.</p></header>
    <section className="surface space-y-5 rounded-3xl p-6">
      <label className="grid gap-2 text-sm font-bold">Edição<select className="field" value={editionId} disabled={busy} onChange={(e) => {setEditionId(e.target.value);setWindowData(null);setError("");}}>{editions.map((edition) => <option key={edition.id} value={edition.id}>{edition.name}</option>)}</select></label>
      {windowData && <div className="flex items-center gap-3 rounded-2xl border border-cyan/20 p-4"><CalendarClock className="size-6 text-cyan"/><div><p className="font-bold">{label(windowData.status)}</p>{windowData.opensAt && <p className="text-xs text-muted">{new Date(windowData.opensAt).toLocaleString("pt-BR")} até {new Date(windowData.closesAt!).toLocaleString("pt-BR")}</p>}</div></div>}
      {windowData?.status === "NOT_SCHEDULED" && <>
        <p className="text-xs text-muted">As datas serão interpretadas no fuso horário do seu dispositivo e convertidas em UTC para o servidor.</p>
        <label className="grid gap-2 text-sm font-bold">Data e hora de abertura<input className="field" type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} /></label>
        <label className="grid gap-2 text-sm font-bold">Data e hora de encerramento<input className="field" type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} /></label>
        <button type="button" className="btn-primary" disabled={busy || !opensAt || !closesAt} onClick={() => void schedule()}>{busy ? <LoaderCircle className="size-4 animate-spin"/> : <CalendarClock className="size-4"/>} Programar votação</button>
      </>}
      {(windowData?.status === "OPEN" || windowData?.status === "SCHEDULED") && <button type="button" className="btn-ghost" disabled={busy} onClick={() => void close()}>Encerrar votação definitivamente</button>}
      <Link href="/premio/votacao" target="_blank" className="btn-ghost inline-flex">Abrir página pública</Link>
      {error && <p role="alert" className="text-sm text-coral">{error}</p>}
      {notice && <p role="status" className="text-sm text-cyan">{notice}</p>}
    </section>
  </div>;
}
