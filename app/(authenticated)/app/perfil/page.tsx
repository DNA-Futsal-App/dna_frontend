"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, KeyRound, LoaderCircle, Save, ShieldCheck } from "lucide-react";
import { ErrorState, LoadingCards } from "@/components/feedback";
import { PageIntro } from "@/components/page-intro";
import { clientApi } from "@/lib/client-api";
import type { CatalogItem, Team, UserProfile } from "@/lib/types";
import { useApiData } from "@/lib/use-api-data";
import { CatalogCategory } from "@/lib/types";

export default function ProfilePage() {
  const router = useRouter();
  const { data: profile, loading, error, reload } = useApiData<UserProfile>("/api/me");
  const [divisions, setDivisions] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [divisionId, setDivisionId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");
  const selectedCategoryId = categoryId ?? profile?.categoryId ?? "";
  const selectedDivisionId = divisionId ?? profile?.divisionId ?? "";
  const selectedTeamId = teamId ?? profile?.teamId ?? "";

  const selectedCategory =
    categories.find(
      (item) =>
        item.id === selectedCategoryId,
    );

  const selectedEventId =
    selectedCategory?.eventId ??
    profile?.eventId ??
    null;

  useEffect(() => {
    clientApi<CatalogItem[]>(
      "/api/catalog/divisions",
    )
      .then(setDivisions)
      .catch(() => setDivisions([]));
  }, []);

  useEffect(() => {
    if (!selectedDivisionId) {
      setCategories([]);
      return;
    }

    clientApi<CatalogCategory[]>(
      `/api/catalog/categories?divisionId=${encodeURIComponent(
        selectedDivisionId,
      )}`,
    )
      .then(setCategories)
      .catch(() => setCategories([]));
  }, [selectedDivisionId]);


  useEffect(() => {
    if (!selectedEventId) {
      setTeams([]);
      return;
    }

    clientApi<Team[]>(
      `/api/catalog/teams?eventId=${encodeURIComponent(
        String(selectedEventId),
      )}`,
    )
      .then(setTeams)
      .catch(() => setTeams([]));
  }, [selectedEventId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setMessage(""); setFormError("");
    const form = new FormData(event.currentTarget);
    try {
      const updated = await clientApi<UserProfile>("/api/me", {
        method: "PUT",
        body: JSON.stringify({
          name: form.get("name"), email: form.get("email"), phone: form.get("phone"),
          childInstagram: form.get("childInstagram") || null,
          categoryId: form.get("categoryId") || null,
          divisionId: form.get("divisionId") || null,
          teamId: form.get("teamId") || null,
          currentPassword: form.get("currentPassword"),
        }),
      });
      if (!updated.emailVerified) {
        await fetch("/api/auth/logout", { method: "POST" });
        router.replace(`/verificar-email?login=${encodeURIComponent(updated.email)}`);
        return;
      }
      setMessage("Perfil atualizado com sucesso.");
      await reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Não foi possível atualizar o perfil.");
    } finally { setSaving(false); }
  }

  async function requestPasswordReset() {
    if (!profile) return;
    setResetting(true); setMessage(""); setFormError("");
    try {
      await clientApi("/api/auth/password-reset/request", { method: "POST", body: JSON.stringify({ login: profile.email }) });
      setMessage("Enviamos o link de alteração de senha para seu e-mail.");
    } catch (err) { setFormError(err instanceof Error ? err.message : "Não foi possível solicitar a alteração."); }
    finally { setResetting(false); }
  }

  if (loading) return <LoadingCards count={4} />;
  if (error || !profile) return <ErrorState message={error || "Perfil não encontrado."} onRetry={reload} />;

  return (
    <div><PageIntro eyebrow="Sua conta" title="Meu perfil" description="Atualize seus dados e escolha o time que aparece primeiro no aplicativo." />
      <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
        <form onSubmit={submit} className="surface rounded-[1.75rem] p-5 sm:p-7">
          <h2 className="display-title text-2xl font-black text-ivory">Dados pessoais</h2>
          <div className="mt-5 grid gap-4"><label className="grid gap-1.5 text-sm font-bold">Nome<input className="field" name="name" defaultValue={profile.name} minLength={2} maxLength={120} required /></label><div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-bold">E-mail<input className="field" name="email" type="email" defaultValue={profile.email} required /></label><label className="grid gap-1.5 text-sm font-bold">Telefone<input className="field" name="phone" type="tel" defaultValue={profile.phone} required /></label></div><label className="grid gap-1.5 text-sm font-bold">Instagram do atleta<input className="field" name="childInstagram" defaultValue={profile.childInstagram ?? ""} placeholder="@usuario" pattern="^@?[A-Za-z0-9._]{1,30}$" /></label></div>
          <div className="mt-6 border-t border-white/8 pt-6"><h2 className="display-title text-2xl font-black text-ivory">Preferência esportiva</h2><p className="mt-1 text-sm text-muted">Estes filtros definem o conteúdo inicial do app.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">

              <label className="grid gap-1.5 text-sm font-bold">
                Divisão
                <select className="field" name="divisionId" value={selectedDivisionId} onChange={(event) => { setDivisionId(event.target.value); setTeamId(""); setTeams([]); }}>
                  <option value="">Nenhuma</option>{divisions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
              </label>
              <label className="grid gap-1.5 text-sm font-bold">
                Categoria
                <select className="field" name="categoryId" value={selectedCategoryId} onChange={(event) => { setCategoryId(event.target.value); setDivisionId(""); setTeamId(""); setDivisions([]); setTeams([]); }} disabled={!selectedDivisionId}>
                  <option value="">Nenhuma</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-bold">
                Time
                <select className="field" name="teamId" value={selectedTeamId} onChange={(event) => setTeamId(event.target.value)} disabled={!selectedCategoryId}>
                  <option value="">Nenhum</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
                </select>
              </label>
            </div>
          </div>
          <div className="mt-6 rounded-2xl border border-amber/20 bg-amber/6 p-4"><label className="grid gap-1.5 text-sm font-bold text-amber">Confirme sua senha atual<input className="field" name="currentPassword" type="password" autoComplete="current-password" maxLength={72} required placeholder="Necessária para salvar qualquer alteração" /></label></div>
          {message ? <p className="mt-4 flex items-center gap-2 rounded-xl bg-cyan/8 px-3.5 py-3 text-sm font-bold text-cyan" role="status"><CheckCircle2 className="size-4" />{message}</p> : null}
          {formError ? <p className="mt-4 rounded-xl border border-coral/25 bg-coral/8 px-3.5 py-3 text-sm text-[#ffb195]" role="alert">{formError}</p> : null}
          <button className="btn-primary mt-5 w-full sm:w-auto" disabled={saving}>{saving ? <LoaderCircle className="size-5 animate-spin" /> : <Save className="size-5" />}{saving ? "Salvando..." : "Salvar alterações"}</button>
        </form>

        <aside className="grid content-start gap-4">
          <section className="surface rounded-2xl p-5"><span className="inline-flex size-11 items-center justify-center rounded-xl bg-cyan/10 text-cyan"><ShieldCheck className="size-5" /></span><h2 className="mt-4 font-black text-ivory">Conta verificada</h2><p className="mt-1 text-sm leading-relaxed text-muted">Seu e-mail está confirmado e sua conta está protegida por sessões revogáveis.</p></section>
          <section className="surface rounded-2xl p-5"><span className="inline-flex size-11 items-center justify-center rounded-xl bg-amber/10 text-amber"><KeyRound className="size-5" /></span><h2 className="mt-4 font-black text-ivory">Alterar senha</h2><p className="mt-1 text-sm leading-relaxed text-muted">Por segurança, a troca é iniciada por um link enviado ao seu e-mail e pode ser solicitada até três vezes por dia.</p><button type="button" className="btn-secondary mt-4 w-full !min-h-10 !py-2 text-sm" onClick={requestPasswordReset} disabled={resetting}>{resetting ? <LoaderCircle className="size-4 animate-spin" /> : null}{resetting ? "Solicitando..." : "Enviar link por e-mail"}</button></section>
        </aside>
      </div>
    </div>
  );
}
