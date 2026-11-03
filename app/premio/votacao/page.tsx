/* eslint-disable react-hooks/set-state-in-effect */
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, LoaderCircle, Trophy } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { popularVotingRequest, votingCategoryUrl } from "@/lib/popular-voting-types";
import type { VotingContext, VotingEdition } from "@/lib/popular-voting-types";

export default function PopularVotingCatalogPage() {
  const [editions, setEditions] = useState<VotingEdition[]>([]);
  const [editionId, setEditionId] = useState("");
  const [contexts, setContexts] = useState<VotingContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingContexts, setLoadingContexts] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    popularVotingRequest<VotingEdition[]>("editions")
      .then((value) => { if (active) { setEditions(value); setEditionId(value[0]?.editionId ?? ""); } })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : "Erro ao carregar edições."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    if (!editionId) return;
    setLoadingContexts(true);
    setContexts([]);
    popularVotingRequest<VotingContext[]>(`editions/${editionId}/contexts`)
      .then((value) => { if (active) setContexts(value); })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : "Erro ao carregar disputas."); })
      .finally(() => { if (active) setLoadingContexts(false); });
    return () => { active = false; };
  }, [editionId]);

  // One card per base category, even when all four award modalities are scheduled.
  const grouped = Array.from(contexts.reduce((map, item) => {
    const key = [item.eventId, item.divisionId, item.categoryId, item.gender].join("|");
    const entries = map.get(key) ?? [];
    entries.push(item);
    map.set(key, entries);
    return map;
  }, new Map<string, VotingContext[]>()).values());

  return <main className="min-h-dvh bg-night px-4 pb-20 pt-6 text-ivory sm:px-6">
    <div className="mx-auto max-w-7xl space-y-8">
      <header className="flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-3"><BrandLogo size={48}/><strong className="display-title text-xl">DNA Futsal</strong></Link>
        <Link href="/entrar" className="btn-ghost">Entrar</Link>
      </header>
      <section className="max-w-4xl pt-8">
        <p className="eyebrow"><Trophy className="size-4"/> Prêmio Legacy • Votação popular</p>
        <h1 className="display-title mt-4 text-4xl sm:text-6xl">Você decide essa disputa. <span className="text-cyan">Faça diferença.</span></h1>
        <p className="mt-5 text-muted">Cada divisão, categoria e modalidade do prêmio tem seu próprio calendário e uma página exclusiva com os três finalistas.</p>
      </section>
      {error && <p role="alert" className="rounded-xl border border-coral/30 p-4 text-sm text-coral">{error}</p>}
      {loading ? <LoaderCircle className="size-7 animate-spin text-cyan"/> : editions.length === 0 ?
        <section className="surface rounded-2xl p-8">Votação ainda não disponível</section> : <>
        <label className="block max-w-md space-y-2 text-sm font-bold">Edição
          <select className="field mt-2" value={editionId} onChange={(event) => { setEditionId(event.target.value); setError(""); }}>
            {editions.map((item) => <option key={item.editionId} value={item.editionId}>{item.editionName}</option>)}
          </select>
        </label>
        {loadingContexts ? <LoaderCircle className="size-7 animate-spin text-cyan"/> : contexts.length === 0 ?
          <p className="surface rounded-2xl p-6 text-muted">Ainda não há disputas programadas para esta edição.</p> :
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{grouped.map((entries) => {
            const item = entries[0];
            const open = entries.filter((row) => row.status === "OPEN").length;
            const upcoming = entries.filter((row) => row.status === "SCHEDULED").length;
            const closed = entries.filter((row) => row.status === "CLOSED").length;
            return <Link key={`${item.eventId}|${item.divisionId}|${item.categoryId}|${item.gender}`}
              href={votingCategoryUrl(editionId, item)} className="surface group rounded-3xl border border-white/10 p-6 transition hover:border-cyan/35">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black uppercase tracking-widest text-cyan">Categoria de base</span>
                <ArrowRight className="size-5 text-muted transition group-hover:translate-x-1 group-hover:text-cyan"/>
              </div>
              <h2 className="mt-4 text-2xl font-black">{item.divisionName} • {item.categoryName}</h2>
              <p className="mt-2 text-xs text-muted">{item.gender === "FEMALE" ? "Feminino" : "Masculino"} • Campeonato #{item.eventId}</p>
              <p className="mt-5 text-sm font-bold">{entries.length} modalidade(s) do prêmio</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                {open > 0 && <span className="rounded-full border border-cyan/40 px-3 py-1 text-cyan">{open} aberta(s)</span>}
                {upcoming > 0 && <span className="rounded-full border border-amber/40 px-3 py-1 text-amber">{upcoming} em breve</span>}
                {closed > 0 && <span className="rounded-full border border-white/20 px-3 py-1 text-muted">{closed} encerrada(s)</span>}
              </div>
              <p className="mt-4 text-xs text-muted">Ver horários e os três finalistas de cada modalidade</p>
            </Link>;
          })}</div>}
      </>}
    </div>
  </main>;
}
