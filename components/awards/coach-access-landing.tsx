"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BadgeCheck, LoaderCircle, ShieldCheck, UserRoundPlus } from "lucide-react";
import { AwardFpfsSignature } from "@/components/awards/award-fpfs-signature";
import { BrandLogo } from "@/components/brand-logo";
import { clientApi } from "@/lib/client-api";
import type { CoachAccessLinkInfo } from "@/lib/awards-types";

export function CoachAccessLanding() {
  const [access,setAccess]=useState<CoachAccessLinkInfo|null>(null);
  const [error,setError]=useState("");
  useEffect(()=>{clientApi<CoachAccessLinkInfo>("/api/awards/coach-invite/current").then(r=>{if(!r.available)throw new Error(r.status==="REVOKED"?"Este link foi revogado pela organização.":"O credenciamento não está disponível.");setAccess(r);}).catch(e=>setError(e instanceof Error?e.message:"Não foi possível carregar o credenciamento."));},[]);
  return <main className="min-h-dvh bg-night px-4 py-8 text-ivory sm:px-6"><div className="mx-auto max-w-3xl">
    <div className="mb-8 flex items-center justify-between gap-4"><div className="flex items-center gap-3"><BrandLogo size={54} priority/><div><strong className="display-title block text-xl">DNA Futsal</strong><span className="text-xs font-bold uppercase tracking-[.16em] text-cyan">Prêmio DNA Futsal</span></div></div><AwardFpfsSignature compact /></div>
    {error?<section className="rounded-3xl border border-coral/25 bg-panel p-6"><h1 className="display-title text-3xl">Credenciamento indisponível</h1><p className="mt-3 text-sm text-muted">{error}</p></section>:!access?<section className="flex min-h-72 items-center justify-center rounded-3xl border border-white/8 bg-panel"><LoaderCircle className="size-9 animate-spin text-cyan"/></section>:<section className="overflow-hidden rounded-3xl border border-cyan/15 bg-panel">
      <div className="border-b border-white/8 bg-gradient-to-br from-cyan/10 to-transparent p-6 sm:p-8"><div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-cyan"><BadgeCheck className="size-5"/>Credenciamento validado</div><h1 className="display-title mt-4 text-3xl sm:text-4xl">Júri técnico • {access.editionName}</h1><p className="mt-3 text-sm leading-relaxed text-muted">Este link autoriza seu credenciamento como treinador participante do júri técnico.</p></div>
      <div className="grid gap-6 p-6 sm:p-8"><div><h2 className="text-lg font-black">Como participar</h2><ol className="mt-4 grid gap-3 text-sm leading-relaxed text-muted"><li>1. Crie sua conta ou entre em uma conta existente.</li><li>2. Confirme seu e-mail, se necessário.</li><li>3. Informe divisão, categoria e time que você treina.</li><li>4. Você votará somente dentro desse contexto.</li><li>5. Contextos extras para treinadores de mais de uma categoria são liberados apenas pela administração.</li><li>6. Cada contexto possui um voto independente e definitivo.</li></ol></div>
      <div className="flex gap-3 rounded-2xl border border-amber/20 bg-amber/5 p-4 text-sm text-muted"><ShieldCheck className="size-5 shrink-0 text-amber"/><p>Na categoria Técnico, sua própria equipe não poderá receber seu voto. A revogação do link impede novos credenciamentos, sem remover treinadores já credenciados.</p></div>
      <div className="grid gap-3 sm:grid-cols-2"><Link href="/cadastro-treinador-acesso" className="btn-primary w-full"><UserRoundPlus className="size-5"/>Fazer cadastro</Link><Link href="/entrar" className="btn-ghost w-full">Já tenho conta</Link></div></div>
    </section>}
  </div></main>;
}
