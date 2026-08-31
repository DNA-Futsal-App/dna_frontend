"use client";

import Link from "next/link";

import {
  ArrowRight,
  CalendarClock,
  Goal,
  Newspaper,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react";

import {
  ErrorState,
  LoadingCards,
} from "@/components/feedback";

import { MatchCard } from "@/components/match-card";
import { NewsCard } from "@/components/news-card";
import { SectionHeading } from "@/components/section-heading";
import { StandingsTable } from "@/components/standings-table";
import { TopScorerList } from "@/components/top-scorer-list";

import type {
  DashboardData,
} from "@/lib/types";

import { useApiData } from "@/lib/use-api-data";
import { useProfile } from "@/components/profile-context";

export default function DashboardPage() {
  const {
    data,
    loading,
    error,
    reload,
  } =
    useApiData<DashboardData>(
      "/api/dashboard",
    );

  const { profile } =
    useProfile();

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error || !data) {
    return (
      <ErrorState
        message={
          error ||
          "Dados não encontrados."
        }
        onRetry={reload}
      />
    );
  }

  const home =
    data.sports;

  const teamMode =
    home.mode === "TEAM" &&
    home.team != null;

  const firstName =
    profile?.name
      ?.trim()
      .split(/\s+/)[0];

  return (
    <div>
      <header className="mb-7">
        <p className="eyebrow">
          Seu resumo
        </p>

        <h1 className="mt-2 text-4xl font-black leading-none text-ivory sm:text-5xl">
          Olá
          {firstName
            ? `, ${firstName}`
            : ""}
          .
        </h1>

        <p className="mt-2 text-sm text-muted sm:text-base">
          {teamMode
            ? `Aqui está o que importa para ${home.team?.name} hoje.`
            : `Panorama de ${[
                home.category,
                home.division,
              ]
                .filter(Boolean)
                .join(" • ") ||
                "sua competição"}.`}
        </p>
      </header>

      {home.nextMatch ? (
        <section className="relative overflow-hidden rounded-[1.75rem] border border-cyan/20 bg-gradient-to-br from-deep/35 via-panel to-night p-5 shadow-glow sm:p-7">
          <div className="absolute -right-16 -top-20 size-64 rounded-full border-[26px] border-cyan/6" />

          <div className="relative">
            <p className="eyebrow">
              <CalendarClock className="size-4" />

              {teamMode
                ? "Próximo desafio"
                : "Próximo jogo"}
            </p>

            <div className="mt-5">
              <MatchCard
                match={
                  home.nextMatch
                }
              />
            </div>

            <Link
              href="/app/jogos"
              className="mt-4 inline-flex items-center gap-2 text-sm font-black text-cyan hover:text-white"
            >
              Ver calendário completo

              <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>
      ) : (
        <section className="surface rounded-[1.75rem] p-6">
          <p className="eyebrow">
            <CalendarClock className="size-4" />
            Calendário
          </p>

          <h2 className="mt-3 text-xl font-black text-ivory">
            Nenhum próximo jogo confirmado
          </h2>

          <p className="mt-1 text-sm text-muted">
            Assim que a FPFS publicar novos confrontos, eles aparecerão aqui.
          </p>
        </section>
      )}

      <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {teamMode ? (
          <Stat
            icon={TrendingUp}
            label="Posição"
            value={
              home.teamStanding
                ?.position != null
                ? `${home.teamStanding.position}º`
                : "—"
            }
            tone="cyan"
          />
        ) : (
          <Stat
            icon={Users}
            label="Times"
            value={String(
              home.teamCount,
            )}
            tone="cyan"
          />
        )}

        <Stat
          icon={Goal}
          label="Último jogo"
          value={
            home.latestMatch
              ? `${
                  home.latestMatch
                    .homeScore ?? "—"
                } × ${
                  home.latestMatch
                    .awayScore ?? "—"
                }`
              : "—"
          }
          tone="amber"
        />

        <Stat
          icon={CalendarClock}
          label="Próximos"
          value={String(
            home.upcomingCount,
          )}
          tone="coral"
        />

        <Stat
          icon={Newspaper}
          label="Notícias"
          value={String(
            data.news.totalElements,
          )}
          tone="ocean"
        />
      </section>

      {home.currentPhase ? (
        <section className="mt-5 flex flex-wrap items-center gap-2 text-xs text-muted">
          <span className="rounded-full border border-cyan/15 bg-cyan/8 px-3 py-2 font-bold text-cyan">
            {home.currentPhase}
          </span>

          {home.standingGroup ? (
            <span className="rounded-full border border-white/10 px-3 py-2">
              {home.standingGroup}
            </span>
          ) : null}
        </section>
      ) : null}

      {teamMode ? (
        <section className="mt-8">
          <Link
            href="/app/meu-time"
            className="surface group flex items-center justify-between gap-4 rounded-2xl p-4 transition hover:border-cyan/20 sm:p-5"
          >
            <span className="flex items-center gap-3">
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-cyan/10 text-cyan">
                <Shield className="size-5" />
              </span>

              <span>
                <strong className="block text-sm text-ivory">
                  Meu Time
                </strong>

                <small className="text-muted">
                  Veja desempenho, forma recente e artilheiros do clube.
                </small>
              </span>
            </span>

            <ArrowRight className="size-5 text-muted transition group-hover:text-cyan" />
          </Link>
        </section>
      ) : (
        <section className="mt-8">
          <Link
            href="/app/perfil"
            className="surface group flex items-center justify-between gap-4 rounded-2xl p-4 transition hover:border-cyan/20 sm:p-5"
          >
            <span className="flex items-center gap-3">
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-cyan/10 text-cyan">
                <Shield className="size-5" />
              </span>

              <span>
                <strong className="block text-sm text-ivory">
                  Escolha um time
                </strong>

                <small className="text-muted">
                  Personalize resultados, posição e próximos confrontos.
                </small>
              </span>
            </span>

            <ArrowRight className="size-5 text-muted transition group-hover:text-cyan" />
          </Link>
        </section>
      )}

      {home.standings.length ? (
        <section className="mt-10">
          <SectionHeading
            eyebrow="Desempenho"
            title="Classificação"
            href="/app/tabela"
          />

          <StandingsTable
            standings={
              home.standings
            }
            followedTeamId={
              home.team?.id
            }
            limit={5}
          />
        </section>
      ) : null}

      <div className="mt-10 grid gap-10 xl:grid-cols-2">
        <section>
          <SectionHeading
            eyebrow="Goleadores"
            title="Artilharia"
            href="/app/artilharia"
          />

          {home.topScorers.length ? (
            <TopScorerList
              scorers={
                home.topScorers
              }
              limit={4}
            />
          ) : (
            <p className="surface rounded-2xl p-5 text-sm text-muted">
              A artilharia ainda não está disponível para esta fase.
            </p>
          )}
        </section>

        <section>
          <SectionHeading
            eyebrow="Últimos resultados"
            title={
              teamMode
                ? "Seu time"
                : "Jogos encerrados"
            }
            href="/app/jogos?tab=played"
          />

          {home.recentMatches.length ? (
            <div className="grid gap-3">
              {home.recentMatches.map(
                (match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    compact
                  />
                ),
              )}
            </div>
          ) : (
            <p className="surface rounded-2xl p-5 text-sm text-muted">
              Nenhum resultado disponível.
            </p>
          )}
        </section>
      </div>

      {data.news.content.length ? (
        <section className="mt-10">
          <SectionHeading
            eyebrow="Conteúdo"
            title="Notícias da base"
            href="/app/noticias"
          />

          <div className="grid gap-4 lg:grid-cols-3">
            {data.news.content
              .slice(0, 3)
              .map(
                (
                  article,
                  index,
                ) => (
                  <NewsCard
                    key={
                      article.id
                    }
                    article={
                      article
                    }
                    featured={
                      index === 0 &&
                      data.news.content
                        .length === 1
                    }
                  />
                ),
              )}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  tone:
    | "cyan"
    | "amber"
    | "coral"
    | "ocean";
}) {
  const tones = {
    cyan: "bg-cyan/10 text-cyan",
    amber:
      "bg-amber/10 text-amber",
    coral:
      "bg-coral/10 text-coral",
    ocean:
      "bg-ocean/10 text-ocean",
  };

  return (
    <article className="surface rounded-2xl p-4 sm:p-5">
      <span
        className={`inline-flex size-9 items-center justify-center rounded-xl ${tones[tone]}`}
      >
        <Icon className="size-4" />
      </span>

      <strong className="mt-4 block text-3xl font-black text-ivory">
        {value}
      </strong>

      <span className="text-xs font-bold text-muted">
        {label}
      </span>
    </article>
  );
}

function DashboardSkeleton() {
  return (
    <div>
      <div className="skeleton h-10 w-64 rounded-xl" />

      <div className="skeleton mt-3 h-4 w-80 max-w-full rounded-full" />

      <div className="skeleton mt-7 h-64 rounded-[1.75rem]" />

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({
          length: 4,
        }).map((_, index) => (
          <div
            key={index}
            className="skeleton h-32 rounded-2xl"
          />
        ))}
      </div>

      <div className="mt-10">
        <LoadingCards count={3} />
      </div>
    </div>
  );
}