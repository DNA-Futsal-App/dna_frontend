import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  CirclePlay,
  Film,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserRoundPlus,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

const participationSteps = [
  {
    number: "01",
    title: "Crie sua conta",
    description:
      "Cadastre-se gratuitamente no DNA Futsal para identificar o responsável pelo atleta.",
  },
  {
    number: "02",
    title: "Complete o perfil",
    description:
      "Mantenha o @ do atleta, divisão, categoria e time corretamente preenchidos.",
  },
  {
    number: "03",
    title: "Escolha as categorias",
    description:
      "Quando as inscrições forem abertas, você poderá escolher uma ou mais categorias.",
  },
  {
    number: "04",
    title: "Envie os vídeos",
    description:
      "Cada categoria escolhida deverá ter o próprio vídeo do atleta.",
  },
];

const rules = [
  "Cada atleta poderá ser inscrito por apenas um responsável.",
  "O atleta poderá concorrer em mais de uma categoria.",
  "Será necessário enviar um vídeo para cada categoria escolhida.",
  "Os vídeos poderão ser substituídos enquanto o período de inscrição estiver aberto.",
  "O @ do atleta e o time serão obtidos a partir do perfil do responsável.",
];

export default function PremioDnaPage() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-night text-ivory">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-70"
        aria-hidden="true"
      >
        <div className="absolute -right-56 -top-64 size-[38rem] rounded-full border-[70px] border-cyan/5" />
        <div className="absolute -bottom-72 -left-72 size-[42rem] rounded-full border-[76px] border-coral/5" />
      </div>

      <header className="relative z-20 mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-3"
          aria-label="DNA Futsal — página inicial"
        >
          <BrandLogo size={52} priority />
          <span className="hidden sm:block">
            <strong className="display-title block text-xl leading-none">
              DNA Futsal
            </strong>
            <small className="text-[9px] font-bold uppercase tracking-[.18em] text-cyan">
              Prêmio DNA Futsal
            </small>
          </span>
        </Link>

        <Link
          href="/entrar"
          className="btn-ghost !min-h-10 !px-4 !py-2 text-sm"
        >
          Já tenho conta
        </Link>
      </header>

      <section className="mx-auto grid min-h-[calc(100dvh-5rem)] max-w-7xl items-center gap-10 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-[1fr_.92fr] lg:px-8 lg:py-16">
        <div className="relative z-10">
          <span className="eyebrow">
            <span className="size-2 rounded-full bg-coral" />
            Prêmio DNA Futsal
          </span>

          <h1 className="display-title mt-5 max-w-4xl text-[clamp(3.3rem,9vw,7rem)] font-black leading-[0.83] text-ivory">
            Mostre ao futsal{" "}
            <span className="text-cyan">do que seu filho é capaz.</span>
          </h1>

          <p className="mt-7 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            Inscreva o atleta no Prêmio DNA Futsal e apresente os momentos que
            fizeram a diferença dentro de quadra.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/cadastro" className="btn-primary">
              <UserRoundPlus className="size-5" aria-hidden="true" />
              Quero inscrever meu filho
              <ArrowRight className="size-5" aria-hidden="true" />
            </Link>

            <a href="#como-participar" className="btn-ghost">
              Como funciona
            </a>
          </div>

          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs font-bold text-muted">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="size-4 text-cyan" />
              Cadastro gratuito
            </span>
            <span className="inline-flex items-center gap-2">
              <Film className="size-4 text-amber" />
              Um vídeo por categoria
            </span>
            <span className="inline-flex items-center gap-2">
              <BadgeCheck className="size-4 text-coral" />
              Um responsável por atleta
            </span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl lg:ml-auto">
          <div className="absolute -inset-8 -z-10 rounded-full bg-cyan/8 blur-3xl" />
          <div className="relative overflow-hidden rounded-[2rem] border border-cyan/15 bg-panel shadow-glow">
            <Image
              src="/premio-dna/inscricao-hero.svg"
              alt="Ilustração de atleta de futsal em ação"
              width={920}
              height={1080}
              priority
              unoptimized
              className="h-auto w-full"
            />

            <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/10 bg-night/80 p-4 backdrop-blur-md sm:inset-x-5 sm:bottom-5">
              <span className="text-[10px] font-black uppercase tracking-[.17em] text-cyan">
                Sua história começa aqui
              </span>
              <p className="mt-1 text-sm font-bold text-ivory sm:text-base">
                Separe o melhor momento do atleta e prepare a inscrição.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        id="como-participar"
        className="border-y border-white/7 bg-ink/20"
      >
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-2xl">
            <p className="eyebrow">Como participar</p>
            <h2 className="display-title mt-3 text-4xl font-black leading-none sm:text-5xl">
              Da arquibancada para a disputa.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted sm:text-base">
              O processo começa pelo cadastro do responsável e pela atualização
              do perfil do atleta. Depois, o envio das categorias e dos vídeos
              acontece no fluxo da premiação.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {participationSteps.map((step) => (
              <article
                key={step.number}
                className="surface rounded-[1.65rem] p-5 sm:p-6"
              >
                <span className="display-title text-4xl font-black text-cyan/40">
                  {step.number}
                </span>
                <h3 className="mt-5 text-lg font-black text-ivory">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:px-8 lg:py-24">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/8 bg-panel">
          <Image
            src="/premio-dna/futsal-moment.svg"
            alt="Ilustração de um momento de futsal de base"
            width={980}
            height={820}
            unoptimized
            className="h-auto w-full"
          />
        </div>

        <div>
          <p className="eyebrow">
            <Sparkles className="size-4" />
            Reconhecimento
          </p>
          <h2 className="display-title mt-3 text-4xl font-black leading-[.95] sm:text-5xl">
            Cada lance conta uma história.{" "}
            <span className="text-amber">Mostre a dele.</span>
          </h2>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
            Gol, defesa, habilidade, inteligência de jogo ou um momento
            inesquecível: o Prêmio DNA Futsal foi pensado para colocar os
            talentos da base em evidência.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-cyan/15 bg-cyan/5 p-4">
              <Trophy className="size-5 text-cyan" />
              <strong className="mt-3 block text-sm text-ivory">
                Mais de uma categoria
              </strong>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                O atleta poderá disputar diferentes categorias, desde que seja
                enviado um vídeo para cada uma.
              </p>
            </div>

            <div className="rounded-2xl border border-amber/15 bg-amber/5 p-4">
              <CirclePlay className="size-5 text-amber" />
              <strong className="mt-3 block text-sm text-ivory">
                Vídeos atualizáveis
              </strong>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Enquanto as inscrições estiverem abertas, o responsável poderá
                substituir o vídeo enviado.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">
        <div className="grid overflow-hidden rounded-[2rem] border border-white/8 bg-gradient-to-br from-panel via-panel to-deep/20 lg:grid-cols-[1fr_.85fr]">
          <div className="p-6 sm:p-8 lg:p-10">
            <p className="eyebrow">Antes de começar</p>
            <h2 className="display-title mt-3 text-3xl font-black sm:text-4xl">
              Prepare o perfil do atleta.
            </h2>

            <div className="mt-7 grid gap-3">
              {rules.map((rule) => (
                <div
                  key={rule}
                  className="flex gap-3 rounded-xl border border-white/7 bg-night/25 px-4 py-3"
                >
                  <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-cyan/10 text-cyan">
                    <Check className="size-3.5" />
                  </span>
                  <p className="text-sm leading-relaxed text-muted">{rule}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col justify-center border-t border-white/8 bg-night/35 p-6 sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
            <p className="text-xs font-black uppercase tracking-[.16em] text-coral">
              Prêmio DNA Futsal
            </p>
            <h2 className="display-title mt-3 text-4xl font-black leading-[.92] text-ivory sm:text-5xl">
              O próximo destaque pode estar na sua casa.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Crie sua conta agora e deixe o perfil do atleta pronto para o
              processo de inscrição.
            </p>

            <Link href="/cadastro" className="btn-primary mt-7 w-full sm:w-auto">
              Quero participar
              <ArrowRight className="size-5" />
            </Link>

            <Link
              href="/entrar"
              className="mt-4 text-center text-sm font-black text-amber hover:text-white sm:text-left"
            >
              Já possui uma conta? Entrar
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/7">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <BrandLogo size={40} />
            <span>
              <strong className="block text-ivory">DNA Futsal</strong>
              <span>A base joga aqui.</span>
            </span>
          </div>
          <span>Prêmio DNA Futsal</span>
        </div>
      </footer>
    </main>
  );
}
