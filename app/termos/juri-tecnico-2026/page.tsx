import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Check, ShieldCheck } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";

export const metadata: Metadata = {
  title: "Termo de Ciência, Aceite e Confidencialidade | DNA Futsal",
  description:
    "Termo de Ciência, Aceite e Confidencialidade do Júri Técnico do Prêmio Legacy 2026.",
};

const clauses = [
  {
    title: "1. Participação e veracidade das informações",
    text: "Declaro que as informações fornecidas em meu cadastro são verdadeiras e que realizarei pessoalmente a votação, na qualidade de treinador habilitado da respectiva categoria/divisão.",
  },
  {
    title: "2. Confidencialidade do voto",
    text: "Estou ciente de que minha votação possui caráter confidencial. Minhas escolhas individuais não serão divulgadas publicamente nem compartilhadas com atletas, clubes ou demais treinadores. O acesso individual aos votos ficará restrito aos responsáveis especificamente autorizados pela Federação Paulista de Futsal - FPFS e pelo DNA Futsal, exclusivamente para controle, validação, eventual auditoria e apuração dos resultados.",
  },
  {
    title: "3. Integridade e segurança da votação",
    text: "Comprometo-me a realizar pessoalmente minha votação, a não compartilhar com terceiros o link, senha, código ou qualquer outra credencial de acesso e a não praticar qualquer ato destinado a interferir indevidamente ou comprometer a segurança, regularidade ou integridade do processo.",
  },
  {
    title: "4. Regras de votação",
    text: "Poderei votar em qualquer atleta elegível constante da relação disponibilizada pela Federação Paulista de Futsal para minha respectiva categoria/divisão, inclusive em atleta pertencente ao meu próprio time ou clube. Na votação para Melhor Treinador, não poderei votar em mim mesmo, devendo indicar outro treinador elegível.",
  },
  {
    title: "5. Caráter definitivo do voto",
    text: "Estou ciente de que, após a confirmação e o envio da votação, minhas escolhas serão consideradas definitivas e não poderão ser alteradas.",
  },
  {
    title: "6. Tratamento de dados pessoais",
    text: "Estou ciente de que, para minha identificação, verificação de idade, autenticação e validação da votação, serão tratados os dados fornecidos no cadastro, incluindo nome completo, data de nascimento, CPF, e-mail, telefone, time/clube representado e categoria/divisão treinada, além de eventuais registros técnicos necessários à segurança e ao funcionamento da plataforma.",
  },
  {
    title: "7. Finalidade e proteção dos dados",
    text: "Os dados pessoais serão utilizados exclusivamente para identificação do votante, verificação de idade, autenticação, comunicação relacionada ao processo, segurança da plataforma, controle, validação, auditoria e apuração dos resultados da premiação, observadas as disposições da Lei nº 13.709/2018 - Lei Geral de Proteção de Dados Pessoais (LGPD). O acesso será limitado às pessoas e aos prestadores de serviços que necessitem dessas informações para a realização do processo.",
  },
  {
    title: "8. Direitos do titular",
    text: "O titular poderá exercer os direitos previstos na LGPD, inclusive solicitar informações sobre o tratamento, acesso e correção de seus dados e as demais providências legalmente aplicáveis, por meio do canal disponibilizado pela organização.",
  },
] as const;

export default function JuryTechnicalTermsPage() {
  return (
    <main className="min-h-dvh bg-night text-ivory">
      <header className="border-b border-white/8 bg-ink/30">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <Link href="/" className="flex items-center gap-3" aria-label="DNA Futsal">
            <BrandLogo size={44} priority />
            <div>
              <strong className="display-title block text-lg leading-none">
                DNA Futsal
              </strong>
              <span className="text-[9px] font-black uppercase tracking-[.16em] text-cyan">
                Prêmio Legacy 2026
              </span>
            </div>
          </Link>

          <Link href="/" className="btn-ghost !min-h-10 !px-4 !py-2 text-sm">
            <ArrowLeft className="size-4" />
            Voltar
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-8">
          <span className="eyebrow">
            <ShieldCheck className="size-4" />
            Júri Técnico
          </span>
          <h1 className="display-title mt-4 text-4xl font-black leading-[.95] sm:text-5xl">
            Termo de Ciência, Aceite e Confidencialidade
          </h1>
          <p className="mt-3 text-sm font-black uppercase tracking-[.12em] text-cyan">
            Júri Técnico – Prêmio Legacy 2026
          </p>
          <p className="mt-6 max-w-3xl text-sm leading-relaxed text-muted sm:text-base">
            Ao prosseguir com a votação e assinalar o campo de aceite, declaro
            estar ciente e de acordo com as seguintes condições:
          </p>
        </div>

        <div className="grid gap-4">
          {clauses.map((clause) => (
            <section
              key={clause.title}
              className="surface rounded-2xl p-5 sm:p-6"
            >
              <h2 className="text-base font-black text-ivory sm:text-lg">
                {clause.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-muted">{clause.text}</p>
            </section>
          ))}
        </div>

        <section className="mt-6 rounded-2xl border border-cyan/20 bg-cyan/5 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-cyan/10 text-cyan">
              <Check className="size-4" />
            </span>
            <p className="text-sm font-bold leading-7 text-ivory">
              Li e aceito os termos acima, declaro que as informações fornecidas
              são verdadeiras e confirmo que realizarei pessoalmente minha
              votação, de forma livre e consciente, observando as regras da
              premiação.
            </p>
          </div>
        </section>

        <p className="mt-6 text-center text-xs leading-relaxed text-muted">
          Para continuar o cadastro ou a inscrição, retorne à aba anterior e
          marque o campo de aceite.
        </p>
      </div>
    </main>
  );
}
