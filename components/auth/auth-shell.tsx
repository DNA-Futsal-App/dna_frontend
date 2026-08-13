import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export function AuthShell({ eyebrow, title, description, children, backHref = "/" }: { eyebrow: string; title: string; description: string; children: React.ReactNode; backHref?: string }) {
  return (
    <main className="relative min-h-dvh overflow-hidden px-4 py-6 sm:grid sm:place-items-center sm:px-6 sm:py-10">
      <div className="pointer-events-none absolute -right-36 -top-36 size-96 rounded-full border-[42px] border-cyan/5" />
      <div className="pointer-events-none absolute -bottom-52 -left-40 size-[30rem] rounded-full border-[50px] border-coral/5" />
      <div className="relative mx-auto w-full max-w-lg">
        <div className="mb-6 flex items-center justify-between">
          <Link href={backHref} className="inline-flex size-11 items-center justify-center rounded-full border border-white/10 text-muted transition hover:border-cyan/30 hover:text-cyan" aria-label="Voltar"><ArrowLeft className="size-5" /></Link>
          <Link href="/" aria-label="DNA Futsal — Página inicial"><BrandLogo size={56} priority /></Link>
          <span className="size-11" aria-hidden="true" />
        </div>
        <section className="surface rounded-[1.75rem] p-5 sm:p-8">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="display-title mt-3 text-4xl font-black leading-[0.95] text-ivory sm:text-5xl">{title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">{description}</p>
          <div className="mt-7">{children}</div>
        </section>
      </div>
    </main>
  );
}
