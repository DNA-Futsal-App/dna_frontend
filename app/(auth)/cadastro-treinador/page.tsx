"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  Check,
  LoaderCircle,
  ShieldCheck,
  UserRoundPlus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { clientApi } from "@/lib/client-api";
import type {
  CatalogCategory,
  CatalogItem,
} from "@/lib/types";
import type { CoachInviteInfo } from "@/lib/awards-types";

export default function CoachRegisterPage() {
  const router = useRouter();
  const [invite, setInvite] = useState<CoachInviteInfo | null>(null);
  const [divisionName, setDivisionName] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [checkingInvite, setCheckingInvite] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    clientApi<CoachInviteInfo>("/api/awards/coach-invite/current")
      .then(async (result) => {
        if (!active) return;

        if (!result.available) {
          throw new Error("Este convite não está mais disponível.");
        }

        setInvite(result);

        const divisions = await clientApi<CatalogItem[]>(
          "/api/catalog/divisions",
        ).catch(() => []);

        if (!active) return;

        setDivisionName(
          divisions.find((item) => item.id === result.divisionId)?.name ??
            `Divisão ${result.divisionId}`,
        );

        const categories = await clientApi<CatalogCategory[]>(
          `/api/catalog/categories?divisionId=${encodeURIComponent(
            String(result.divisionId),
          )}`,
        ).catch(() => []);

        if (!active) return;

        setCategoryName(
          categories.find((item) => item.id === result.categoryId)?.name ??
            `Categoria ${result.categoryId}`,
        );
      })
      .catch((err) => {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Não foi possível carregar o convite.",
          );
        }
      })
      .finally(() => {
        if (active) setCheckingInvite(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!invite) {
      setError("Valide novamente o convite antes de criar sua conta.");
      return;
    }

    setError("");

    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");

    if (password !== form.get("passwordConfirmation")) {
      setError("As senhas precisam ser iguais.");
      return;
    }

    setLoading(true);

    try {
      await clientApi("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          phone: form.get("phone"),
          password,
          childInstagram: null,
          eventId: null,
          categoryId: null,
          divisionId: null,
          teamId: null,
        }),
      });

      router.push(
        `/verificar-email?login=${encodeURIComponent(
          String(form.get("email")),
        )}`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível criar sua conta.",
      );
      setLoading(false);
    }
  }

  if (checkingInvite) {
    return (
      <AuthShell
        eyebrow="Prêmio DNA Futsal"
        title="Preparando seu cadastro."
        description="Validando sua credencial de treinador."
      >
        <LoaderCircle className="mx-auto size-10 animate-spin text-cyan" />
      </AuthShell>
    );
  }

  if (!invite) {
    return (
      <AuthShell
        eyebrow="Prêmio DNA Futsal"
        title="Convite necessário."
        description={error || "Abra novamente o link enviado pela organização."}
      >
        <Link
          href="/"
          className="btn-ghost w-full"
        >
          Voltar ao DNA Futsal
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Cadastro de treinador"
      title="Crie sua conta."
      description="Sua permissão de votação será vinculada a esta conta depois que você confirmar o e-mail e entrar."
    >
      <div className="mb-6 rounded-2xl border border-cyan/15 bg-cyan/5 p-4">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-cyan">
          <ShieldCheck className="size-4" />
          Credencial do convite
        </div>
        <p className="mt-3 font-black text-ivory">{invite.coachName}</p>
        <p className="mt-1 text-sm text-muted">
          {divisionName || `Divisão ${invite.divisionId}`} •{" "}
          {categoryName || `Categoria ${invite.categoryId}`} •{" "}
          {invite.teamName}
        </p>
      </div>

      <form onSubmit={submit} className="grid gap-5">
        <label className="grid gap-1.5 text-sm font-bold">
          Nome completo
          <input
            className="field"
            name="name"
            autoComplete="name"
            minLength={2}
            maxLength={120}
            required
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-bold">
            E-mail
            <input
              className="field"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </label>
          <label className="grid gap-1.5 text-sm font-bold">
            Telefone
            <input
              className="field"
              name="phone"
              type="tel"
              autoComplete="tel"
              required
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-bold">
            Senha
            <input
              className="field"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={10}
              maxLength={72}
              required
              placeholder="Mínimo de 10 caracteres"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-bold">
            Confirmar senha
            <input
              className="field"
              name="passwordConfirmation"
              type="password"
              autoComplete="new-password"
              minLength={10}
              required
            />
          </label>
        </div>

        <p className="flex gap-2 text-xs leading-relaxed text-muted">
          <Check className="mt-0.5 size-4 shrink-0 text-cyan" />
          Enviaremos um link de confirmação. O convite permanecerá associado
          a este navegador até você entrar na conta.
        </p>

        {error ? (
          <p
            className="rounded-xl border border-coral/25 bg-coral/8 px-3.5 py-3 text-sm text-[#ffb195]"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <button className="btn-primary w-full" disabled={loading}>
          {loading ? (
            <LoaderCircle className="size-5 animate-spin" />
          ) : (
            <UserRoundPlus className="size-5" />
          )}
          {loading ? "Criando conta..." : "Criar minha conta"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Já possui conta?{" "}
        <Link href="/entrar" className="font-black text-cyan hover:text-white">
          Entrar
        </Link>
      </p>
    </AuthShell>
  );
}
