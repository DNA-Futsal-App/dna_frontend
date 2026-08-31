"use client";

import Link from "next/link";
import {
  Goal,
  Medal,
  Settings,
  Shield,
  Target,
  TrendingUp,
} from "lucide-react";

import {
  EmptyState,
  ErrorState,
  LoadingCards,
} from "@/components/feedback";

import { MatchCard } from "@/components/match-card";
import { PageIntro } from "@/components/page-intro";
import { SectionHeading } from "@/components/section-heading";
import { TeamMark } from "@/components/team-mark";
import { TopScorerList } from "@/components/top-scorer-list";

import type {
  MyTeam,
  TeamFormResult,
} from "@/lib/types";

import { useApiData } from "@/lib/use-api-data";

export default function MyTeamPage() {
  const {
    data,
    loading,
    error,
    reload,
  } =
    useApiData<MyTeam>(
      "/api/my-team",
    );

  if (loading) {
    return (
      <LoadingCards count={5} />
    );
  }

  if (error || !data) {
    return (
      <ErrorState
        message={
          error ||
          "Não foi possível carregar o seu time."
        }
        onRetry={reload}
      />
    );
  }

  if (
    !data.configured ||
    !data.team
  ) {
    return (
      <ConfigureTeam
        category={data.category}
        division={data.division}
      />
    );
  }

  const {
    team,
    standing,
  } = data;

  return (
    <div>
      <PageIntro
        eyebrow={
          data.currentPhase
            ? data.currentPhase
            : `Temporada ${data.season}`
        }
        title={team.name}
        description={[
          data.competitionName,
          data.category,
          data.division,
        ]
          .filter(Boolean)
          .join(" • ")}
      />

      <section className="surface relative overflow-hidden rounded-[1.75rem] p-5 sm:p-7">
        <div className="absolute -right-16 -top-20 size-64 rounded-full border-[26px] border-cyan/5" />

        <div className="relative flex items-center gap-4">
          <TeamMark
            team={team}
            size="lg"
          />

          <div className="min-w-0">
            <p className="eyebrow">
              <Shield className="size-4" />
              Meu time
            </p>

            <h2 className="mt-2 truncate text-2xl font-black text-ivory sm:text-3xl">
              {team.name}
            </h2>

            <p className="mt-1 text-sm text-muted">
              {data.currentPhase ??
                "Fase não informada"}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric
          icon={TrendingUp}
          label="Posição"
          value={
            standing?.position != null
              ? `${standing.position}º`
              : "—"
          }
        />

        <Metric
          icon={Medal}
          label="Pontos"
          value={
            standing?.points != null
              ? String(
                  standing.points,
                )
              : "—"
          }
        />

        <Metric
          icon={Target}
          label="Jogos"
          value={
            standing?.played != null
              ? String(
                  standing.played,
                )
              : "—"
          }
        />

        <Metric
          icon={Goal}
          label="Saldo"
          value={
            standing?.goalDifference !=
            null
              ? `${
                  standing.goalDifference >
                  0
                    ? "+"
                    : ""
                }${
                  standing.goalDifference
                }`
              : "—"
          }
        />
      </section>

      {data.recentForm.length ? (
        <section className="mt-5 surface rounded-2xl p-4 sm:p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted">
            Forma recente
          </p>

          <div className="mt-3 flex items-center gap-2">
            {data.recentForm.map(
              (
                result,
                index,
              ) => (
                <FormBadge
                  key={`${result}-${index}`}
                  result={
                    result
                  }
                />
              ),
            )}

            <span className="ml-2 text-xs text-muted">
              mais recente primeiro
            </span>
          </div>
        </section>
      ) : null}

      {data.nextMatch ? (
        <section className="mt-10">
          <SectionHeading
            eyebrow="Calendário"
            title="Próximo jogo"
            href="/app/jogos"
          />

          <MatchCard
            match={
              data.nextMatch
            }
          />
        </section>
      ) : null}

      <section className="mt-10">
        <SectionHeading
          eyebrow="Resultados"
          title="Últimos jogos"
          href="/app/jogos?tab=played"
        />

        {!data.recentMatches.length ? (
          <EmptyState
            title="Nenhum resultado"
            description="Os últimos resultados deste time aparecerão aqui."
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {data.recentMatches.map(
              (match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  compact
                />
              ),
            )}
          </div>
        )}
      </section>

      <section className="mt-10">
        <SectionHeading
          eyebrow="Destaques"
          title="Artilheiros do time"
          href={`/app/artilharia?teamId=${encodeURIComponent(
            team.id,
          )}`}
        />

        {!data.topScorers.length ? (
          <EmptyState
            title="Sem artilheiros disponíveis"
            description="Assim que a fonte publicar dados de artilharia deste time, eles aparecerão aqui."
          />
        ) : (
          <TopScorerList
            scorers={
              data.topScorers
            }
          />
        )}
      </section>
    </div>
  );
}

function ConfigureTeam({
  category,
  division,
}: {
  category?: string | null;
  division?: string | null;
}) {
  return (
    <div>
      <PageIntro
        eyebrow="Personalização"
        title="Meu Time"
        description="Escolha um clube para acompanhar resultados, posição, próximos jogos e destaques."
      />

      <section className="surface rounded-[1.75rem] px-5 py-10 text-center">
        <Shield className="mx-auto size-10 text-cyan" />

        <h2 className="mt-4 text-xl font-black text-ivory">
          Escolha o seu time
        </h2>

        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          Você está acompanhando
          {" "}
          {[
            category,
            division,
          ]
            .filter(Boolean)
            .join(" • ") ||
            "a competição padrão"}
          , mas ainda não escolheu um clube.
        </p>

        <Link
          href="/app/perfil"
          className="btn-primary mt-6 inline-flex"
        >
          <Settings className="size-4" />
          Configurar meu time
        </Link>
      </section>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
}) {
  return (
    <article className="surface rounded-2xl p-4 sm:p-5">
      <span className="inline-flex size-9 items-center justify-center rounded-xl bg-cyan/10 text-cyan">
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

function FormBadge({
  result,
}: {
  result: TeamFormResult;
}) {
  const content = {
    WIN: {
      label: "V",
      className:
        "bg-cyan/12 text-cyan border-cyan/20",
    },

    DRAW: {
      label: "E",
      className:
        "bg-amber/12 text-amber border-amber/20",
    },

    LOSS: {
      label: "D",
      className:
        "bg-coral/12 text-coral border-coral/20",
    },

    UNKNOWN: {
      label: "—",
      className:
        "bg-white/5 text-muted border-white/10",
    },
  }[result];

  return (
    <span
      className={`inline-flex size-8 items-center justify-center rounded-full border text-xs font-black ${content.className}`}
    >
      {content.label}
    </span>
  );
}