import Link from "next/link";
import { ArrowLeft, CircleAlert } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export default function VotingNotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-night px-4 py-12 text-ivory">
      <section className="surface w-full max-w-xl rounded-3xl border border-white/10 p-7 sm:p-10">
        <Link href="/" className="mb-8 inline-flex items-center gap-3">
          <BrandLogo size={44} />
          <span className="display-title text-lg font-black">DNA Futsal</span>
        </Link>
        <CircleAlert aria-hidden="true" className="size-10 text-amber" />
        <p className="eyebrow mt-5">404 · Página não encontrada</p>
        <h1 className="display-title mt-3 text-3xl font-black sm:text-4xl">
          Esta votação não está disponível.
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted sm:text-base">
          O período de votação pode ter terminado, ou este endereço não corresponde a uma disputa disponível.
        </p>
        <Link href="/premio/votacao" className="btn-primary mt-7 inline-flex min-h-12 items-center gap-2 px-6">
          <ArrowLeft className="size-4" /> Ver votações disponíveis
        </Link>
      </section>
    </main>
  );
}
