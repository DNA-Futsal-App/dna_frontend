"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { clientApi } from "@/lib/client-api";
import type { Team } from "@/lib/types";

type Invitation = {
  linkId: string;
  editionId: string;
  eventId: number;
  divisionId: number;
  categoryId: number;
  gender: "MALE" | "FEMALE";
  status: string;
  available: boolean;
  expiresAt: string;
};

type Application = { id: string; status: string; teamName: string };
type Mode = "register" | "login" | "connected";

export default function CategoryInvitationPage() {
  const { token } = useParams<{ token: string }>();
  const [invite, setInvite] = useState<Invitation | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState("");
  const [role, setRole] = useState("Treinador principal");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [mode, setMode] = useState<Mode>("connected");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitted, setSubmitted] = useState<Application | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    Promise.all([
      clientApi<Invitation>(`/api/public/awards/coach-category-links/${encodeURIComponent(token)}`),
      clientApi<Team[]>(`/api/public/awards/coach-category-links/${encodeURIComponent(token)}/teams`).catch(() => []),
    ])
      .then(([link, list]) => {
        if (cancelled) return;
        setInvite(link);
        setTeams(list);
      })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "Convite inválido."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  async function sendApplication() {
    if (!token || !teamId || !role.trim()) return;
    const application = await clientApi<Application>("/api/auth/coach-category-apply", {
      method: "POST",
      body: JSON.stringify({ token, teamId, role, evidenceUrl: evidenceUrl || null }),
    });
    setSubmitted(application);
    setNotice("Solicitação registrada. O administrador analisará seu vínculo com o clube.");
  }

  async function submitExisting(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      if (mode === "login") {
        const form = new FormData(e.currentTarget);
        await clientApi("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ login: String(form.get("login") ?? ""), password: String(form.get("password") ?? "") }),
        });
      }
      await sendApplication();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível solicitar o credenciamento.");
    } finally { setBusy(false); }
  }

  async function submitRegister(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token || !teamId || !role.trim()) return;
    const form = new FormData(e.currentTarget);
    if (form.get("password") !== form.get("confirmPassword")) {
      setError("As senhas informadas são diferentes."); return;
    }
    setBusy(true); setError(""); setNotice("");
    try {
      await clientApi("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: String(form.get("name") ?? ""), email: String(form.get("email") ?? ""),
          phone: String(form.get("phone") ?? ""), password: String(form.get("password") ?? ""),
          coachCategoryRegistration: { token, teamId, role, evidenceUrl: evidenceUrl || null },
        }),
      });
      setNotice("Conta criada e solicitação recebida! Confirme seu e-mail para que a administração possa aprovar o credenciamento. Depois, entre com a sua conta.");
      setMode("connected");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível concluir o cadastro.");
    } finally { setBusy(false); }
  }

  return <main className="min-h-dvh bg-night px-4 py-9 text-ivory">
    <section className="mx-auto grid w-full max-w-xl gap-5 rounded-3xl border border-white/10 bg-panel p-6 sm:p-8">
      <header>
        <p className="text-xs font-black uppercase tracking-[.16em] text-cyan">Prêmio DNA Futsal</p>
        <h1 className="display-title mt-3 text-3xl">Credenciamento do júri técnico</h1>
      </header>
      {loading ? <p className="text-sm text-muted">Validando seu convite...</p> : null}
      {error ? <p role="alert" className="rounded-xl border border-coral/25 p-3 text-sm text-[#ffb195]">{error}</p> : null}
      {notice ? <p role="status" className="rounded-xl border border-cyan/20 p-3 text-sm text-cyan">{notice}</p> : null}
      {invite && !invite.available ? <p className="text-sm text-muted">Este convite não está disponível: {invite.status}.</p> : null}
      {invite?.available && !submitted ? <>
        <p className="text-sm text-muted">Modalidade: <strong>{invite.gender === "MALE" ? "Masculino" : "Feminino"}</strong> • Divisão {invite.divisionId} • Categoria {invite.categoryId}. Convite válido até {new Date(invite.expiresAt).toLocaleString("pt-BR")}.</p>
        <label className="grid gap-2 text-sm font-bold">Clube que você representa
          <select className="field" value={teamId} onChange={(e) => setTeamId(e.target.value)} required>
            <option value="">Selecione seu clube</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold">Função no clube
          <input className="field" value={role} onChange={(e) => setRole(e.target.value)} required maxLength={80} />
        </label>
        <label className="grid gap-2 text-sm font-bold">Link de comprovação (opcional)
          <input className="field" type="url" value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} maxLength={500} placeholder="https://..." />
        </label>
        <p className="rounded-xl border border-amber/20 p-3 text-xs text-muted">O vínculo com o clube será conferido pela administração. Receber o convite não libera o voto automaticamente.</p>
        <div className="grid grid-cols-3 gap-2 text-xs sm:text-sm">
          <button type="button" className={mode === "connected" ? "btn-primary" : "btn-ghost"} onClick={() => { setMode("connected"); setError(""); }}>Já entrei</button>
          <button type="button" className={mode === "login" ? "btn-primary" : "btn-ghost"} onClick={() => { setMode("login"); setError(""); }}>Entrar</button>
          <button type="button" className={mode === "register" ? "btn-primary" : "btn-ghost"} onClick={() => { setMode("register"); setError(""); }}>Criar conta</button>
        </div>
        {mode === "register" ? <form onSubmit={submitRegister} className="grid gap-3">
          <input name="name" className="field" required minLength={2} maxLength={120} placeholder="Nome completo" autoComplete="name" />
          <input name="email" className="field" type="email" required maxLength={254} placeholder="E-mail" autoComplete="email" />
          <input name="phone" className="field" required maxLength={30} placeholder="Telefone" autoComplete="tel" />
          <input name="password" className="field" type="password" required minLength={10} maxLength={72} placeholder="Senha (mín. 10 caracteres)" autoComplete="new-password" />
          <input name="confirmPassword" className="field" type="password" required minLength={10} maxLength={72} placeholder="Confirmar senha" autoComplete="new-password" />
          <label className="flex items-start gap-2 text-xs text-muted"><input className="mt-0.5" type="checkbox" required />Li e aceito o <Link className="text-cyan underline" href="/termos/juri-tecnico-2026" target="_blank">termo do júri técnico</Link>.</label>
          <button className="btn-primary" disabled={busy || !teamId || !role.trim()}>{busy ? "Enviando..." : "Cadastrar e solicitar credenciamento"}</button>
        </form> : <form onSubmit={submitExisting} className="grid gap-3">
          {mode === "login" ? <>
            <input name="login" className="field" required autoComplete="username" placeholder="E-mail ou telefone" />
            <input name="password" className="field" required type="password" autoComplete="current-password" placeholder="Senha" />
          </> : <p className="text-xs text-muted">Utilize esta opção se já fez login no DNA Futsal neste navegador.</p>}
          <label className="flex items-start gap-2 text-xs text-muted"><input className="mt-0.5" type="checkbox" required />Aceito o <Link className="text-cyan underline" href="/termos/juri-tecnico-2026" target="_blank">termo do júri técnico</Link>.</label>
          <button className="btn-primary" disabled={busy || !teamId || !role.trim()}>{busy ? "Enviando..." : "Solicitar aprovação"}</button>
        </form>}
      </> : null}
      {submitted ? <div className="grid gap-2 text-sm"><p>Equipe: <strong>{submitted.teamName}</strong></p><p>Status: <strong>{submitted.status === "PENDING" ? "Em análise" : submitted.status}</strong></p><Link className="text-cyan underline" href="/app">Voltar ao aplicativo</Link></div> : null}
    </section>
  </main>;
}
