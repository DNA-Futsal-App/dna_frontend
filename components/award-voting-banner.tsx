import Link from "next/link";
import { ArrowRight, CalendarClock, Trophy, Vote } from "lucide-react";

/** Convite da Home para o catálogo público de votações do Prêmio Legacy. */
export function AwardVotingBanner() {
  return (
    <section
      aria-label="Participe da votação popular do Prêmio Legacy"
      className="relative mb-6 overflow-hidden rounded-[1.75rem] border border-cyan/25 bg-linear-to-br from-cyan/12 via-panel to-night shadow-[0_20px_70px_rgba(0,0,0,.22)]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full border-30px border-cyan/5"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-20 right-24 size-48 rounded-full bg-amber/5 blur-3xl"
      />

      <div className="relative grid items-center gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:p-8">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan/25 bg-cyan/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.15em] text-cyan">
            <Trophy className="size-3.5" /> Prêmio Legacy · Votação popular
          </span>

          <div className="mt-4 flex items-start gap-3">
            <span aria-hidden="true" className="hidden size-12 shrink-0 items-center justify-center rounded-2xl bg-cyan/10 text-cyan sm:inline-flex">
              <Vote className="size-6" />
            </span>
            <div>
              <h2 className="display-title text-2xl font-black leading-tight text-ivory sm:text-3xl lg:text-4xl">
                Seu voto faz parte dessa história.
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
                Escolha sua divisão, categoria e modalidade do prêmio. Confira as votações em andamento ou programadas e vote no seu finalista favorito.
              </p>
              <p className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-amber">
                <CalendarClock className="size-4 shrink-0" /> É necessário fazer login para registrar seu voto.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 lg:items-end">
          <Link
            href="/premio/votacao"
            className="group inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan px-6 text-sm font-black text-ink transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan sm:w-auto lg:min-w-56"
          >
            Escolher votação
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <span className="text-center text-[11px] text-muted">Consulte as disputas disponíveis</span>
        </div>
      </div>
    </section>
  );
}
