"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  CalendarDays,
  House,
  LogOut,
  Medal,
  Newspaper,
  Settings,
  Shield,
  TableProperties,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { initials } from "@/lib/client-api";
import { ProfileProvider, useProfile } from "@/components/profile-context";

const navigation = [
  {
    href: "/app",
    label: "Início",
    icon: House,
    exact: true,
    mobile: true,
  },
  {
    href: "/app/jogos",
    label: "Jogos",
    icon: CalendarDays,
    mobile: true,
  },
   {
    href: "/app/meu-time",
    label: "Meu time",
    icon: Shield,
    mobile: true,
  },
  {
    href: "/app/tabela",
    label: "Tabela",
    icon: TableProperties,
    mobile: true,
  },
  {
    href: "/app/artilharia",
    label: "Artilharia",
    icon: Medal,
    mobile: true,
  },
  {
    href: "/app/noticias",
    label: "Notícias",
    icon: Newspaper,
    mobile: false,
  },
];
export function AppShell({ children }: { children: React.ReactNode }) {
  return <ProfileProvider><AppShellContent>{children}</AppShellContent></ProfileProvider>;
}

function AppShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, preferenceLabel } = useProfile();

  useEffect(() => {
    const handleExpired = () => router.replace("/entrar?expired=1");
    window.addEventListener("dna:session-expired", handleExpired);
    return () => window.removeEventListener("dna:session-expired", handleExpired);
  }, [router]);

  async function logout() {

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } finally {
      router.replace("/entrar");
      router.refresh();
    }
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[17rem_1fr]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-68 border-r border-white/8 bg-night/92 px-5 py-6 backdrop-blur-xl lg:flex lg:flex-col">
        <Link href="/app" className="flex items-center gap-3" aria-label="DNA Futsal — Início">
          <BrandLogo size={54} priority />
          <span><strong className="display-title block text-xl leading-none text-ivory">DNA Futsal</strong><small className="mt-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-cyan">A base joga aqui</small></span>
        </Link>
        <nav className="mt-10 grid gap-1" aria-label="Navegação principal">
          {navigation.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-bold transition ${active ? "bg-cyan/10 text-cyan" : "text-muted hover:bg-white/5 hover:text-ivory"}`} aria-current={active ? "page" : undefined}>
                <Icon className="size-5" aria-hidden="true" />{item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-white/8 pt-4">
          <Link href="/app/perfil" className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-bold transition ${pathname.startsWith("/app/perfil") ? "bg-cyan/10 text-cyan" : "text-muted hover:bg-white/5 hover:text-ivory"}`}><Settings className="size-5" aria-hidden="true" />Meu perfil</Link>
          <button type="button" onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-bold text-muted transition hover:bg-coral/8 hover:text-coral"><LogOut className="size-5" aria-hidden="true" />Sair</button>
        </div>
      </aside>

      <div className="lg:col-start-2">
        <header className="sticky top-0 z-20 border-b border-white/7 bg-night/80 backdrop-blur-xl">
          <div className="mx-auto flex h-17 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <Link href="/app" className="flex items-center lg:hidden" aria-label="DNA Futsal — Início"><BrandLogo size={45} priority /></Link>
            <button type="button" className="group flex min-w-0 items-center gap-2 rounded-full border border-white/8 bg-panel/75 px-3.5 py-2 text-left transition hover:border-cyan/25">
              <span className="size-2 rounded-full bg-cyan shadow-[0_0_12px_rgba(98,227,232,.8)]" aria-hidden="true" />
              <span className="min-w-0"><small className="block text-[9px] font-black uppercase tracking-wider text-muted">Acompanhando</small><strong className="block truncate text-xs text-ivory sm:text-sm">{preferenceLabel}</strong></span>
            </button>
            <Link href="/app/perfil" className="inline-flex size-10 items-center justify-center rounded-full border border-cyan/20 bg-gradient-to-br from-cyan/20 to-deep/30 text-xs font-black text-cyan" aria-label="Abrir meu perfil">{initials(profile?.name ?? "DNA")}</Link>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 pb-[calc(6.5rem+var(--safe-bottom))] pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-white/10 bg-night/94 px-1 pb-[var(--safe-bottom)] backdrop-blur-xl lg:hidden" aria-label="Navegação principal">
        {navigation
          .filter((item) => item.mobile)
          .map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={`flex min-h-17 flex-col items-center justify-center gap-1 text-[10px] font-bold transition ${active ? "text-cyan" : "text-muted"}`} aria-current={active ? "page" : undefined}>
                <Icon className={`size-5 ${active ? "drop-shadow-[0_0_8px_rgba(98,227,232,.45)]" : ""}`} aria-hidden="true" />{item.label}
              </Link>
            );
          })}
      </nav>
    </div>
  );
}
