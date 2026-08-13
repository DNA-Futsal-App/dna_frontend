import Link from "next/link";
import { ArrowRight, BellRing, ChartNoAxesColumnIncreasing, Newspaper, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { DemoButton } from "@/components/demo-button";

export default function HomePage() {
  return (
    <main className="relative min-h-dvh overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(98,227,232,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(98,227,232,.035)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:linear-gradient(to_bottom,black,transparent_75%)]" />
      <header className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="DNA Futsal"><BrandLogo size={52} priority /><span className="hidden sm:block"><strong className="display-title block text-xl leading-none">DNA Futsal</strong><small className="text-[9px] font-bold uppercase tracking-[.18em] text-cyan">A base joga aqui</small></span></Link>
        <div className="flex items-center gap-2"><Link href="/entrar" className="btn-ghost !min-h-10 !px-4 !py-2 text-sm">Entrar</Link><Link href="/cadastro" className="btn-primary !min-h-10 !px-4 !py-2 text-sm">Criar conta</Link></div>
      </header>

      <section className="mx-auto grid min-h-[calc(100dvh-5rem)] max-w-7xl items-center gap-10 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-18">
        <div>
          <span className="eyebrow"><span className="size-2 rounded-full bg-coral" />Futsal de base, do seu jeito</span>
          <h1 className="display-title mt-5 max-w-3xl text-[clamp(3.6rem,11vw,7.7rem)] font-black leading-[0.8] text-ivory">O jogo começa <span className="text-cyan">aqui.</span></h1>
          <p className="mt-7 max-w-xl text-base leading-relaxed text-muted sm:text-lg">Resultados, próximos jogos, tabela, artilharia e notícias do time que importa para você — sem precisar caçar informação em vários lugares.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link href="/cadastro" className="btn-primary">Começar agora <ArrowRight className="size-5" aria-hidden="true" /></Link><DemoButton /></div>
          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-xs font-bold text-muted"><span className="inline-flex items-center gap-2"><ShieldCheck className="size-4 text-cyan" />Conta verificada</span><span className="inline-flex items-center gap-2"><BellRing className="size-4 text-amber" />Seu time primeiro</span><span className="inline-flex items-center gap-2"><ChartNoAxesColumnIncreasing className="size-4 text-coral" />Dados atualizados</span></div>
        </div>

        <div className="relative mx-auto w-full max-w-lg lg:mx-0 lg:ml-auto">
          <div className="absolute -inset-7 -z-10 rounded-full bg-cyan/10 blur-3xl" />
          <div className="surface overflow-hidden rounded-[2rem] border-cyan/15 shadow-glow">
            <div className="flex items-center justify-between border-b border-white/8 px-5 py-4"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-cyan">Próximo jogo</p><p className="mt-1 text-sm font-bold text-muted">Sub-13 • Divisão Especial</p></div><span className="rounded-full bg-coral/12 px-3 py-1.5 text-xs font-black text-coral">DOM • 10:30</span></div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-5 py-8 text-center"><Team name="Juventus" initials="JUV" tone="amber" /><div><span className="display-title text-4xl font-black text-ivory">×</span><small className="mt-1 block text-[10px] font-bold uppercase tracking-wider text-muted">8ª rodada</small></div><Team name="Santos" initials="SAN" tone="cyan" /></div>
            <div className="border-t border-white/8 bg-ink/25 px-5 py-4"><div className="flex items-center justify-between text-xs"><span className="font-bold text-muted">Líder da competição</span><strong className="text-cyan">19 pontos</strong></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8"><div className="h-full w-4/5 rounded-full bg-gradient-to-r from-coral via-amber to-cyan" /></div></div>
          </div>
          <div className="surface absolute -bottom-7 -left-4 hidden w-48 rounded-2xl p-4 sm:block"><div className="flex items-center gap-3"><span className="inline-flex size-10 items-center justify-center rounded-xl bg-amber/10 text-amber"><Newspaper className="size-5" /></span><span><small className="block text-[9px] font-black uppercase tracking-wider text-muted">Nova matéria</small><strong className="text-sm text-ivory">Resumo da rodada</strong></span></div></div>
        </div>
      </section>
    </main>
  );
}

function Team({ name, initials, tone }: { name: string; initials: string; tone: "cyan" | "amber" }) {
  return <div><span className={`mx-auto inline-flex size-18 items-center justify-center rounded-full border bg-gradient-to-br text-base font-black ${tone === "cyan" ? "border-cyan/30 from-cyan/25 to-deep/20 text-cyan" : "border-amber/30 from-amber/25 to-coral/15 text-amber"}`}>{initials}</span><strong className="mt-3 block truncate text-base text-ivory">{name}</strong></div>;
}
