"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Check, LoaderCircle, UserRoundPlus } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { clientApi } from "@/lib/client-api";
import type {
  CatalogCategory,
  CatalogItem,
  Team,
} from "@/lib/types";

export default function RegisterPage() {
  const router = useRouter();
  const [divisions, setDivisions] =
    useState<CatalogItem[]>([]);

  const [categories, setCategories] =
    useState<CatalogCategory[]>([]);

  const [teams, setTeams] =
    useState<Team[]>([]);

  const [divisionId, setDivisionId] =
    useState("");

  const [categoryId, setCategoryId] =
    useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedCategory =
    categories.find(
      (item) => String(String(item.id) === categoryId,
      ));

  const eventId =
    selectedCategory?.eventId ?? null;

  useEffect(() => {
    clientApi<CatalogItem[]>(
      "/api/catalog/divisions",
    )
      .then(setDivisions)
      .catch(() => setDivisions([]));
  }, []);

  useEffect(() => {
    if (!divisionId) {
      return;
    }

    let active = true;

    clientApi<CatalogCategory[]>(
      `/api/catalog/categories?divisionId=${encodeURIComponent(
        divisionId,
      )}`,
    )
      .then((result) => {
        if (active) {
          setCategories(result);
        }
      })
      .catch(() => {
        if (active) {
          setCategories([]);
        }
      });

    return () => {
      active = false;
    };
  }, [divisionId]);

  useEffect(() => {
    if (!eventId) {
      return;
    }

    let active = true;

    clientApi<Team[]>(
      `/api/catalog/teams?eventId=${encodeURIComponent(
        String(eventId),
      )}`,
    )
      .then((result) => {
        if (active) {
          setTeams(result);
        }
      })
      .catch(() => {
        if (active) {
          setTeams([]);
        }
      });

    return () => {
      active = false;
    };
  }, [eventId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password !== form.get("passwordConfirmation")) return setError("As senhas precisam ser iguais.");
    setLoading(true);
    try {
      await clientApi("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          phone: form.get("phone"),
          password,

          childInstagram:
            form.get("childInstagram") || null,

          eventId,

          categoryId:
            form.get("categoryId") || null,

          divisionId:
            form.get("divisionId") || null,

          teamId:
            form.get("teamId") || null,
        }),
      });
      router.push(`/verificar-email?login=${encodeURIComponent(String(form.get("email")))}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar sua conta.");
      setLoading(false);
    }
  }

  return (
    <AuthShell eyebrow="Sua torcida começa aqui" title="Crie seu DNA." description="Leva menos de dois minutos. A escolha do time é opcional e pode ser alterada depois.">
      <form onSubmit={submit} className="grid gap-5">
        <fieldset className="grid gap-4"><legend className="mb-3 text-xs font-black uppercase tracking-[.15em] text-cyan">Seus dados</legend>
          <label className="grid gap-1.5 text-sm font-bold">Nome completo<input className="field" name="name" autoComplete="name" minLength={2} maxLength={120} required placeholder="Como devemos chamar você?" /></label>
          <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-bold">E-mail<input className="field" name="email" type="email" autoComplete="email" required placeholder="voce@email.com" /></label><label className="grid gap-1.5 text-sm font-bold">Telefone<input className="field" name="phone" type="tel" autoComplete="tel" required placeholder="(11) 99999-9999" /></label></div>
          <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-bold">Senha<input className="field" name="password" type="password" autoComplete="new-password" minLength={10} maxLength={72} required placeholder="Mínimo de 10 caracteres" /></label><label className="grid gap-1.5 text-sm font-bold">Confirmar senha<input className="field" name="passwordConfirmation" type="password" autoComplete="new-password" minLength={10} required placeholder="Repita a senha" /></label></div>
        </fieldset>

        <fieldset className="grid gap-4 border-t border-white/8 pt-5"><legend className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[.15em] text-amber">Preferências <span className="rounded-full bg-white/6 px-2 py-1 text-[9px] text-muted">Opcional</span></legend>
          <label className="grid gap-1.5 text-sm font-bold">Instagram do atleta<input className="field" name="childInstagram" placeholder="@usuario" pattern="^@?[A-Za-z0-9._]{1,30}$" /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-bold">
              Divisão

              <select
                className="field"
                name="divisionId"
                value={divisionId}
                onChange={(event) => {
                  setDivisionId(event.target.value);
                  setCategoryId("");
                  setCategories([]);
                  setTeams([]);
                }}
              >
                <option value="">
                  Escolha depois
                </option>

                {divisions.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-bold">
              Categoria

              <select
                className="field"
                name="categoryId"
                value={categoryId}
                onChange={(event) => {
                  setCategoryId(event.target.value);
                  setTeams([]);
                }}
                disabled={!divisionId}
              >
                <option value="">
                  Escolha depois
                </option>

                {categories.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="grid gap-1.5 text-sm font-bold">Time<select className="field" name="teamId" disabled={!divisionId}><option value="">Escolha depois</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
        </fieldset>
        <p className="flex gap-2 text-xs leading-relaxed text-muted"><Check className="mt-0.5 size-4 shrink-0 text-cyan" />Enviaremos um link para confirmar seu e-mail antes do primeiro acesso.</p>
        {error ? <p className="rounded-xl border border-coral/25 bg-coral/8 px-3.5 py-3 text-sm text-[#ffb195]" role="alert">{error}</p> : null}
        <button className="btn-primary w-full" disabled={loading}>{loading ? <LoaderCircle className="size-5 animate-spin" /> : <UserRoundPlus className="size-5" />}{loading ? "Criando conta..." : "Criar minha conta"}</button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">Já possui conta? <Link href="/entrar" className="font-black text-cyan hover:text-white">Entrar</Link></p>
    </AuthShell>
  );
}
