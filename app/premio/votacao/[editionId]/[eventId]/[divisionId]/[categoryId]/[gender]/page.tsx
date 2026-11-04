/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarClock, LoaderCircle, Trophy } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { popularVotingRequest, votingContextUrl, votingDate, votingStatusLabel } from "@/lib/popular-voting-types";
import type { VotingContext } from "@/lib/popular-voting-types";

export default function PopularVotingBaseCategoryPage() {
  const params = useParams<{ editionId: string; eventId: string; divisionId: string;
    categoryId: string; gender: string }>();
  const [items, setItems] = useState<VotingContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (!params?.editionId) return;
    setLoading(true);
    popularVotingRequest<VotingContext[]>(`editions/${encodeURIComponent(params.editionId)}/contexts`)
      .then((contexts) => {
        if (!active) return;
        setItems(contexts.filter((item) => String(item.eventId) === params.eventId
          && String(item.divisionId) === params.divisionId
          && String(item.categoryId) === params.categoryId && item.gender === params.gender));
      })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : "Não foi possível consultar os prêmios."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [params?.editionId, params?.eventId, params?.divisionId, params?.categoryId, params?.gender]);

  return <main className="min-h-dvh bg-night px-4 pb-20 pt-6 text-ivory sm:px-6">
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-3"><BrandLogo size={48}/><strong className="display-title text-xl">DNA Futsal</strong></Link>
        <Link href="/entrar" className="btn-ghost">Entrar</Link>
      </header>
      <Link href="/premio/votacao" className="inline-flex items-center gap-2 text-sm font-bold text-muted hover:text-cyan">
        <ArrowLeft className="size-4"/> Voltar às categorias
      </Link>
      <section className="pt-4"><p className="eyebrow"><Trophy className="size-4"/> Prêmio Legacy • Categoria de base</p>
        <h1 className="display-title mt-4 text-4xl sm:text-6xl">{items[0] ? `${items[0].divisionName} • ${items[0].categoryName}` : "Votações da categoria"}</h1>
        <p className="mt-3 text-sm text-muted">Cada modalidade possui seus finalistas e uma janela de votação própria.</p>
      </section>
      {error && <p role="alert" className="rounded-xl border border-coral/40 p-4 text-coral">{error}</p>}
      {loading ? <LoaderCircle className="size-7 animate-spin text-cyan"/> : items.length === 0 ?
        <p className="surface rounded-2xl p-8 text-muted">Nenhuma modalidade programada nesta categoria.</p> :
        <section className="grid gap-4 md:grid-cols-2">{items.map((item) =>
          <Link key={item.contestCategory} href={votingContextUrl(params.editionId, item)}
            className="surface group rounded-3xl border border-white/10 p-6 transition hover:border-cyan/30">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black uppercase tracking-widest text-cyan">{item.contestCategoryLabel}</span>
              <ArrowRight className="size-5 text-cyan transition group-hover:translate-x-1"/>
            </div>
            <h2 className="mt-4 text-xl font-black">{item.gender === "FEMALE" ? "Feminino" : "Masculino"} · {item.contestCategoryLabel}</h2>
            <p className="mt-3 text-sm font-bold text-amber">{votingStatusLabel(item.status)}</p>
            <p className="mt-3 flex items-center gap-2 text-xs text-muted"><CalendarClock className="size-4"/>
              {votingDate(item.opensAt)} até {votingDate(item.closesAt)}</p>
            <p className="mt-5 text-xs text-muted">Ver os finalistas e assistir aos vídeos quando a votação abrir.</p>
          </Link>)}</section>}
    </div>
  </main>;
}
