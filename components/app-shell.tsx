"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  X,
  BadgeCheck,
  CalendarDays,
  ClipboardCheck,
  House,
  LogOut,
  Medal,
  Newspaper,
  Settings,
  Shield,
  TableProperties,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { initials } from "@/lib/client-api";
import { ProfileProvider, useProfile } from "@/components/profile-context";
import { clientApi } from "@/lib/client-api";
import type { CoachVotingContext } from "@/lib/awards-types";
import type {
  AwardRegistrationResponse,
} from "@/lib/award-registration-types";

import {
  AWARD_NOTICE_EVENT,
  AWARD_PROCESSING_EVENT,
  clearAwardProcessingWatch,
  consumeAwardNotice,
  publishAwardNotice,
  readAwardProcessingWatch,
  type AwardNotice,
} from "@/lib/award-processing";

type NavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  mobile: boolean;
};

const navigation: NavigationItem[] = [
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
  {
    href: "/app/premio/minha-inscricao",
    label: "Minha inscrição",
    icon: BadgeCheck,
    mobile: false,
  }
];

const coachVotingNavigation: NavigationItem = {
  href: "/app/votacao-treinador",
  label: "Votação",
  icon: Trophy,
  mobile: true,
};

export function AppShell({ children }: { children: React.ReactNode }) {
  return <ProfileProvider><AppShellContent>{children}</AppShellContent></ProfileProvider>;
}

function AppShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, preferenceLabel } = useProfile();
  const [coachVotingEnabled, setCoachVotingEnabled] = useState(false);
  const [awardAdminEnabled, setAwardAdminEnabled] = useState(false);
  const [
    awardNotice,
    setAwardNotice,
  ] = useState<AwardNotice | null>(
    null,
  );

  useEffect(() => {
    function consumeNotice() {
      const notice =
        consumeAwardNotice();

      if (notice) {
        setAwardNotice(
          notice,
        );
      }
    }

    consumeNotice();

    window.addEventListener(
      AWARD_NOTICE_EVENT,
      consumeNotice,
    );

    return () => {
      window.removeEventListener(
        AWARD_NOTICE_EVENT,
        consumeNotice,
      );
    };
  }, []);

  useEffect(() => {
    let running = false;

    async function checkAwardProcessing() {
      if (running) {
        return;
      }

      const watch =
        readAwardProcessingWatch();

      if (!watch) {
        return;
      }

      running = true;

      try {
        const registration =
          await clientApi<AwardRegistrationResponse>(
            "/api/awards/registrations/current",
          );

        const watchedEntries =
          registration.entries.filter(
            (entry) =>
              watch.entryIds.includes(
                entry.id,
              ),
          );

        const failed =
          watchedEntries.some(
            (entry) =>
              entry.mediaStatus ===
              "FAILED",
          );

        if (failed) {
          clearAwardProcessingWatch();

          publishAwardNotice({
            type: "error",

            message:
              "Não conseguimos processar um dos vídeos da sua inscrição. "
              + "Acesse Minha inscrição para tentar novamente.",
          });

          return;
        }

        const allReady =
          watchedEntries.length ===
          watch.entryIds.length &&
          watchedEntries.every(
            (entry) =>
              entry.mediaStatus ===
              "READY",
          );

        if (
          allReady &&
          registration.status ===
          "SUBMITTED"
        ) {
          clearAwardProcessingWatch();

          publishAwardNotice({
            type: "success",

            message:
              `Inscrição #${String(
                watch.registrationNumber,
              ).padStart(
                6,
                "0",
              )} confirmada com sucesso!`,
          });
        }

      } catch {
        /*
         * Uma falha temporária de rede não deve
         * apagar o monitor.
         */
      } finally {
        running = false;
      }
    }

    void checkAwardProcessing();

    const interval =
      window.setInterval(
        () => {
          void checkAwardProcessing();
        },
        4_000,
      );

    const handleNewWatch =
      () => {
        void checkAwardProcessing();
      };

    window.addEventListener(
      AWARD_PROCESSING_EVENT,
      handleNewWatch,
    );

    return () => {
      window.clearInterval(
        interval,
      );

      window.removeEventListener(
        AWARD_PROCESSING_EVENT,
        handleNewWatch,
      );
    };
  }, []);

  useEffect(() => {
    let active = true;

    clientApi<CoachVotingContext>("/api/awards/coach-voting/context")
      .then(() => {
        if (active) setCoachVotingEnabled(true);
      })
      .catch(() => {
        if (active) setCoachVotingEnabled(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    clientApi("/api/admin/awards/editions")
      .then(() => {
        if (active) setAwardAdminEnabled(true);
      })
      .catch(() => {
        if (active) setAwardAdminEnabled(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const navigationItems = useMemo(
    () =>
      coachVotingEnabled
        ? [...navigation, coachVotingNavigation]
        : navigation,
    [coachVotingEnabled],
  );

  const mobileNavigation = navigationItems.filter((item) => item.mobile);

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
          {navigationItems.map((item) => {
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
          {awardAdminEnabled ? (
            <Link
              href="/app/admin/premio-dna"
              className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-bold transition ${pathname.startsWith("/app/admin/premio-dna") ? "bg-amber/10 text-amber" : "text-muted hover:bg-white/5 hover:text-ivory"}`}
            >
              <ClipboardCheck className="size-5" aria-hidden="true" />
              Admin prêmio
            </Link>
          ) : null}
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
            <div className="flex items-center gap-2">
              {awardAdminEnabled ? (
                <Link
                  href="/app/admin/premio-dna"
                  className="inline-flex size-10 items-center justify-center rounded-full border border-amber/20 bg-amber/8 text-amber lg:hidden"
                  aria-label="Administrar Prêmio DNA Futsal"
                >
                  <ClipboardCheck className="size-5" />
                </Link>
              ) : null}
              <Link href="/app/perfil" className="inline-flex size-10 items-center justify-center rounded-full border border-cyan/20 bg-linear-to-br from-cyan/20 to-deep/30 text-xs font-black text-cyan" aria-label="Abrir meu perfil">{initials(profile?.name ?? "DNA")}</Link>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 pb-[calc(6.5rem+var(--safe-bottom))] pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">{children}</main>
      </div>

      <nav className={`fixed inset-x-0 bottom-0 z-30 grid ${mobileNavigation.length >= 6 ? "grid-cols-6" : "grid-cols-5"} border-t border-white/10 bg-night/94 px-1 pb-(--safe-bottom) backdrop-blur-xl lg:hidden`} aria-label="Navegação principal">
        {mobileNavigation
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

      {awardNotice ? (
        <div
          className={`fixed right-4 top-20 z-70 w-[calc(100%-2rem)] max-w-md rounded-2xl border p-4 shadow-2xl backdrop-blur-xl ${awardNotice.type === "success"
              ? "border-cyan/30 bg-night/95"
              : awardNotice.type === "error"
                ? "border-coral/35 bg-night/95"
                : "border-amber/30 bg-night/95"
            }`}
        >
          <div className="flex gap-3">
            {awardNotice.type ===
              "success" ? (
              <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-cyan" />
            ) : (
              <AlertTriangle className="mt-0.5 size-6 shrink-0 text-coral" />
            )}

            <div className="min-w-0 flex-1">
              <strong className="text-sm text-ivory">
                {awardNotice.type ===
                  "success"
                  ? "Prêmio Legacy DNA Futsal"
                  : "Processado vídeo"}
              </strong>

              <p className="mt-1 text-sm leading-relaxed text-muted">
                {
                  awardNotice.message
                }
              </p>

              <Link
                href="/app/premio/minha-inscricao"
                className="mt-3 inline-flex text-xs font-black text-cyan"
              >
                Ver minha inscrição
              </Link>
            </div>

            <button
              type="button"
              onClick={() =>
                setAwardNotice(null)
              }
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-white/5 hover:text-ivory"
              aria-label="Fechar aviso"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
