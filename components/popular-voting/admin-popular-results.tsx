"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { clientApi } from "@/lib/client-api";
import { votingParams } from "@/lib/popular-voting-types";
import type { VotingBoard, VotingContext } from "@/lib/popular-voting-types";

type Props = { editionId: string; context: VotingContext };

export function AdminPopularResults({ editionId, context }: Props) {
  const [board, setBoard] = useState<VotingBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const params = votingParams(context);

  useEffect(() => {
    let active = true;
    clientApi<VotingBoard>(`/api/admin/awards/editions/${editionId}/popular-voting/results?${params}`)
      .then((value) => { if (active) { setBoard(value); setError(""); } })
      .catch((reason: unknown) => {
        if (active) { setBoard(null); setError(reason instanceof Error ? reason.message : "Falha ao obter a apuração."); }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [editionId, params, revision]);

  return <section className="surface space-y-4 rounded-3xl p-6 sm:p-8">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-xl font-black"><ShieldCheck className="size-5 text-cyan"/> Apuração restrita aos administradores</h2>
      <button type="button" className="btn-ghost" disabled={loading}
        onClick={() => { setLoading(true); setRevision((value) => value + 1); }}>
        <RefreshCw className="size-4"/> Atualizar
      </button>
    </div>
    <p className="text-xs text-muted">Esta apuração não é enviada ao público. A contagem não representa homologação oficial do resultado.</p>
    {loading ? <p role="status" className="flex items-center gap-2 text-sm text-muted"><LoaderCircle className="size-4 animate-spin"/> Carregando votos...</p> :
      error ? <p role="alert" className="text-sm text-coral">{error}</p> :
      board?.status === "CLOSED" && board.totalVotes !== null ? <>
        <p className="text-sm font-bold">Total de votos válidos nesta disputa: {board.totalVotes.toLocaleString("pt-BR")}</p>
        <ol className="grid gap-3 md:grid-cols-2">
          {[...board.finalists].sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0)).map((item) =>
            <li key={item.entryId} className="rounded-xl border border-white/10 p-4">
              <p className="font-bold">{item.athleteName}</p>
              <p className="mt-1 text-xs text-muted">{item.teamName}</p>
              <p className="mt-3 text-sm font-bold text-cyan">{(item.votes ?? 0).toLocaleString("pt-BR")} votos
                <span className="ml-2 text-xs text-muted">({board.totalVotes ? (100 * (item.votes ?? 0) / board.totalVotes).toFixed(1) : "0.0"}%)</span>
              </p>
            </li>)}
        </ol>
      </> : <p className="text-sm text-muted">A apuração só fica disponível depois do encerramento.</p>}
  </section>;
}
