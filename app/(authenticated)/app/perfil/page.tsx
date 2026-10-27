"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  KeyRound,
  LoaderCircle,
  LogOut,
  Save,
  ShieldCheck,
  Trophy,
  Trash2,
} from "lucide-react";
import { ErrorState, LoadingCards } from "@/components/feedback";
import { PageIntro } from "@/components/page-intro";
import { clientApi } from "@/lib/client-api";
import {
  SPORTS_COMPETITIONS,
  buildSportsPreference,
  savedSportsPreference,
  categoriesCatalogUrl,
  divisionsCatalogUrl,
  type CompetitionSelection,
} from "@/lib/sports-preference";
import type { CatalogItem, Team, UserProfile } from "@/lib/types";
import { useProfile } from "@/components/profile-context";
import { assertCatalogEventIsolation } from "@/lib/competition-event-guard";
import { CatalogCategory } from "@/lib/types";
import { AccountDeletionDialog } from "@/components/account-deletion-dialog";

export default function ProfilePage() {
  const router = useRouter();
  const {
    profile,
    loading,
    error,
    reload,
    applyProfile,
  } = useProfile();
  const [divisions, setDivisions] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [divisionScope, setDivisionScope] = useState<CompetitionSelection | null>(null);
  const [categoryScope, setCategoryScope] = useState<{
    competition: CompetitionSelection;
    divisionId: string;
  } | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [divisionId, setDivisionId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [competitionCode, setCompetitionCode] = useState<CompetitionSelection | null>(null);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [deletionOpen, setDeletionOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");
  const selectedCompetitionCode: CompetitionSelection =
    competitionCode ?? profile?.competitionCode ?? (profile?.eventId ? "LEGACY" : "PAULISTA");
  const selectedCategoryId = categoryId ?? (competitionCode === null ? profile?.categoryId : "") ?? "";
  const selectedDivisionId = divisionId ?? (competitionCode === null ? profile?.divisionId : "") ?? "";
  const selectedTeamId = teamId ?? (competitionCode === null ? profile?.teamId : "") ?? "";
  const visibleDivisions = divisionScope === selectedCompetitionCode ? divisions : [];
  const visibleCategories = categoryScope?.competition === selectedCompetitionCode &&
    categoryScope.divisionId === selectedDivisionId ? categories : [];

  const selectedCategory = visibleCategories.find(
    (item) => String(item.id) === String(selectedCategoryId),
  );

  const usingPersistedPreference =
    competitionCode === null && divisionId === null && categoryId === null;

  const selectedEventId =
    selectedCategory?.eventId ??
    (usingPersistedPreference ? (profile?.eventId ?? null) : null);

  useEffect(() => {
    let active = true;
    clientApi<CatalogItem[]>(divisionsCatalogUrl(selectedCompetitionCode))
      .then((result) => {
        if (active) { setDivisions(result); setDivisionScope(selectedCompetitionCode); }
      })
      .catch(() => {
        if (active) { setDivisions([]); setDivisionScope(null); }
      });
    return () => { active = false; };
  }, [selectedCompetitionCode]);

  useEffect(() => {
    if (!selectedDivisionId) {
      return;
    }

    let active = true;

    clientApi<CatalogCategory[]>(
      categoriesCatalogUrl(selectedCompetitionCode, selectedDivisionId),
    )
      .then((result) => {
        if (active) {
          setCategories(result);
          setCategoryScope({ competition: selectedCompetitionCode, divisionId: selectedDivisionId });
        }
      })
      .catch(() => {
        if (active) {
          setCategories([]);
          setCategoryScope(null);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedDivisionId, selectedCompetitionCode]);

  useEffect(() => {
    if (!selectedEventId) {
      return;
    }

    let active = true;

    clientApi<Team[]>(
      `/api/catalog/teams?eventId=${encodeURIComponent(
        String(selectedEventId),
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
  }, [selectedEventId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (deleting || loggingOut || saving) return;
    setMessage("");
    setFormError("");
    const form = new FormData(event.currentTarget);
    const unchanged = competitionCode === null && divisionId === null && categoryId === null && teamId === null;
    let sports;
    try {
      sports = unchanged && profile
        ? savedSportsPreference(profile)
        : buildSportsPreference(
            selectedCompetitionCode, selectedEventId, selectedDivisionId,
            selectedCategoryId, selectedTeamId,
          );
      if (!unchanged && selectedCompetitionCode === "PAULISTA_FEMININO" && sports.eventId == null) {
        throw new Error("Para acompanhar o Paulista Feminino, selecione divisão e categoria antes de salvar.");
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Preferência esportiva inválida.");
      return;
    }
    setSaving(true);
    try {
      if (selectedCompetitionCode === "PAULISTA_FEMININO" && sports.eventId != null && sports.divisionId != null) {
        await assertCatalogEventIsolation("PAULISTA_FEMININO", sports.divisionId, sports.eventId, {
          divisions: (code) => clientApi<CatalogItem[]>(divisionsCatalogUrl(code)),
          categories: (code, id) => clientApi<CatalogCategory[]>(categoriesCatalogUrl(code, id)),
        });
      }
      const updatedProfile = await clientApi<UserProfile>("/api/me", {
        method: "PUT",
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          phone: form.get("phone"),

          childInstagram: form.get("childInstagram") || null,
          ...sports,
          currentPassword: form.get("currentPassword"),
        }),
      });

      applyProfile(updatedProfile, {
        division: divisions.find(
          (item) => String(item.id) === updatedProfile.divisionId,
        )?.name,
        category: categories.find(
          (item) => String(item.id) === updatedProfile.categoryId,
        )?.name,
        team: teams.find((item) => item.id === updatedProfile.teamId)?.name,
      });

      setCompetitionCode(null);
      setDivisionId(null);
      setCategoryId(null);
      setTeamId(null);
      setMessage("Perfil atualizado com sucesso.");
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Não foi possível atualizar o perfil.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function requestPasswordReset() {
    if (!profile || deleting || loggingOut || resetting) return;
    setResetting(true);
    setMessage("");
    setFormError("");
    try {
      await clientApi("/api/auth/password-reset/request", {
        method: "POST",
        body: JSON.stringify({ login: profile.email }),
      });
      setMessage("Enviamos o link de alteração de senha para seu e-mail.");
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Não foi possível solicitar a alteração.",
      );
    } finally {
      setResetting(false);
    }
  }

  async function logout() {
    if (deleting || loggingOut) return;
    setLoggingOut(true);
    try {
      await clientApi<void>("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/entrar");
      router.refresh();
    }
  }

  if (loading) return <LoadingCards count={4} />;
  if (error || !profile)
    return (
      <ErrorState
        message={error || "Perfil não encontrado."}
        onRetry={reload}
      />
    );

  return (
    <div>
      <PageIntro
        eyebrow="Sua conta"
        title="Meu perfil"
        description="Atualize seus dados e escolha o time que aparece primeiro no aplicativo."
      />

      <section className="mb-5 lg:hidden">
        <Link
          href="/app/premio/minha-inscricao"
          className="group flex items-center justify-between gap-4 overflow-hidden rounded-2xl border border-amber/20 bg-linear-to-br from-amber/10 via-panel to-night p-4 transition active:scale-[0.99]"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber/10 text-amber">
              <Trophy className="size-5" />
            </span>

            <span className="min-w-0">
              <strong className="block text-sm font-black text-ivory">
                Minhas inscrições
              </strong>

              <small className="mt-0.5 block text-xs leading-relaxed text-muted">
                Veja suas candidaturas, vídeos e o andamento do Prêmio Legacy.
              </small>
            </span>
          </span>

          <ArrowRight className="size-5 shrink-0 text-amber transition-transform group-hover:translate-x-1" />
        </Link>
      </section>
      <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
        <form
          onSubmit={submit}
          className="surface rounded-[1.75rem] p-5 sm:p-7"
        >
          <h2 className="display-title text-2xl font-black text-ivory">
            Dados pessoais
          </h2>
          <div className="mt-5 grid gap-4">
            <label className="grid gap-1.5 text-sm font-bold">
              Nome
              <input
                className="field"
                name="name"
                defaultValue={profile.name}
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
                  defaultValue={profile.email}
                  required
                />
              </label>
              <label className="grid gap-1.5 text-sm font-bold">
                Telefone
                <input
                  className="field"
                  name="phone"
                  type="tel"
                  defaultValue={profile.phone}
                  required
                />
              </label>
            </div>
            <label className="grid gap-1.5 text-sm font-bold">
              Instagram do atleta
              <input
                className="field"
                name="childInstagram"
                defaultValue={profile.childInstagram ?? ""}
                placeholder="@usuario"
                pattern="^@?[A-Za-z0-9._]{1,30}$"
              />
            </label>
          </div>
          <div className="mt-6 border-t border-white/8 pt-6">
            <h2 className="display-title text-2xl font-black text-ivory">
              Preferência esportiva
            </h2>
            <p className="mt-1 text-sm text-muted">
              Selecione o campeonato, a divisão e a categoria que deseja acompanhar. O time é usado na seção Meu Time.
            </p>
            <label className="mt-5 grid gap-1.5 text-sm font-bold">
              Campeonato
              <select
                className="field"
                name="competitionCode"
                value={selectedCompetitionCode}
                onChange={(event) => {
                  setCompetitionCode(event.target.value as CompetitionSelection);
                  setDivisionId("");
                  setCategoryId("");
                  setTeamId("");
                  setDivisions([]);
                  setCategories([]);
                  setTeams([]);
                }}
              >
                {selectedCompetitionCode === "LEGACY" ? (
                  <option value="LEGACY">Manter competição anterior (legado)</option>
                ) : null}
                {SPORTS_COMPETITIONS.map((item) => (
                  <option key={item.code} value={item.code}>{item.label}</option>
                ))}
              </select>
            </label>
            {selectedCompetitionCode === "LEGACY" ? (
              <p className="mt-2 text-xs text-muted">
                Sua competição anterior foi preservada. Para substituí-la, escolha um dos campeonatos acima.
              </p>
            ) : null}
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <label className="grid gap-1.5 text-sm font-bold">
                Divisão
                <select
                  className="field"
                  name="divisionId"
                  value={selectedDivisionId}
                  onChange={(event) => {
                    setDivisionId(event.target.value);

                    setCategoryId("");
                    setTeamId("");

                    setCategories([]);
                    setTeams([]);
                  }}
                >
                  <option value="">Nenhuma</option>
                  {selectedDivisionId && !visibleDivisions.some((item) => String(item.id) === selectedDivisionId) ? (
                    <option value={selectedDivisionId}>Divisão salva ({selectedDivisionId})</option>
                  ) : null}
                  {visibleDivisions.map((item) => (
                    <option key={item.id} value={item.id}>
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
                  value={selectedCategoryId}
                  onChange={(event) => {
                    setCategoryId(event.target.value);
                    setTeamId("");
                    setTeams([]);
                  }}
                  disabled={!selectedDivisionId}
                >
                  <option value="">Nenhuma</option>
                  {selectedCategoryId && !visibleCategories.some((item) => String(item.id) === selectedCategoryId) ? (
                    <option value={selectedCategoryId}>Categoria salva ({selectedCategoryId})</option>
                  ) : null}
                  {visibleCategories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-bold">
                Time
                <select
                  className="field"
                  name="teamId"
                  value={selectedTeamId}
                  onChange={(event) => setTeamId(event.target.value)}
                  disabled={!selectedEventId}
                >
                  <option value="">Nenhum</option>
                  {selectedTeamId && !teams.some((team) => team.id === selectedTeamId) ? (
                    <option value={selectedTeamId}>Time salvo ({selectedTeamId})</option>
                  ) : null}
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <div className="mt-6 rounded-2xl border border-amber/20 bg-amber/6 p-4">
            <label className="grid gap-1.5 text-sm font-bold text-amber">
              Confirme sua senha atual
              <input
                className="field"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                maxLength={72}
                required
                placeholder="Necessária para salvar qualquer alteração"
              />
            </label>
          </div>
          {message ? (
            <p
              className="mt-4 flex items-center gap-2 rounded-xl bg-cyan/8 px-3.5 py-3 text-sm font-bold text-cyan"
              role="status"
            >
              <CheckCircle2 className="size-4" />
              {message}
            </p>
          ) : null}
          {formError ? (
            <p
              className="mt-4 rounded-xl border border-coral/25 bg-coral/8 px-3.5 py-3 text-sm text-[#ffb195]"
              role="alert"
            >
              {formError}
            </p>
          ) : null}
          <button
            className="btn-primary mt-5 w-full sm:w-auto"
            disabled={saving || deleting || loggingOut}
          >
            {saving ? (
              <LoaderCircle className="size-5 animate-spin" />
            ) : (
              <Save className="size-5" />
            )}
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </form>

        <aside className="grid content-start gap-4">
          <section className="surface rounded-2xl p-5">
            <span className="inline-flex size-11 items-center justify-center rounded-xl bg-cyan/10 text-cyan">
              <ShieldCheck className="size-5" />
            </span>
            <h2 className="mt-4 font-black text-ivory">Conta verificada</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Seu e-mail está confirmado e sua conta está protegida por sessões
              revogáveis.
            </p>
          </section>
          <section className="surface rounded-2xl p-5">
            <span className="inline-flex size-11 items-center justify-center rounded-xl bg-amber/10 text-amber">
              <KeyRound className="size-5" />
            </span>
            <h2 className="mt-4 font-black text-ivory">Alterar senha</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Por segurança, a troca é iniciada por um link enviado ao seu
              e-mail e pode ser solicitada até três vezes por dia.
            </p>
            <button
              type="button"
              className="btn-secondary mt-4 w-full min-h-10! py-2! text-sm"
              onClick={requestPasswordReset}
              disabled={resetting || deleting || loggingOut}
            >
              {resetting ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : null}
              {resetting ? "Solicitando..." : "Enviar link por e-mail"}
            </button>
          </section>
          <section className="surface rounded-2xl p-5">
            <span className="inline-flex size-11 items-center justify-center rounded-xl bg-coral/10 text-coral">
              <LogOut className="size-5" />
            </span>
            <h2 className="mt-4 font-black text-ivory">Encerrar sessão</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Saia da sua conta neste dispositivo.
            </p>
            <button
              type="button"
              className="btn-secondary mt-4 w-full min-h-10! py-2! text-sm"
              onClick={logout}
              disabled={loggingOut || deleting || saving || resetting}
            >
              {loggingOut ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <LogOut className="size-4" />
              )}
              {loggingOut ? "Saindo..." : "Sair da conta"}
            </button>
          </section>
          <section className="surface rounded-2xl border border-coral/20 p-5">
            <span className="inline-flex size-11 items-center justify-center rounded-xl bg-coral/10 text-coral">
              <Trash2 className="size-5" aria-hidden="true" />
            </span>
            <h2 className="mt-4 font-black text-ivory">Excluir conta</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Agende a exclusão da sua conta. Seu acesso será bloqueado imediatamente e você terá 10 dias para cancelar.
            </p>
            <button type="button" className="btn-secondary mt-4 w-full min-h-10! border-coral/30! py-2! text-sm text-coral!"
              disabled={saving || resetting || loggingOut || deleting} onClick={() => setDeletionOpen(true)}>
              Excluir minha conta
            </button>
          </section>
        </aside>
      </div>
      {deletionOpen && <AccountDeletionDialog onDismiss={() => setDeletionOpen(false)} onBusyChange={setDeleting} />}
    </div>
  );
}
