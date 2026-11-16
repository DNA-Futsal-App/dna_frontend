"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { clientApi } from "@/lib/client-api";
import type { AdminAwardEdition } from "@/lib/admin-awards-types";
import type { CatalogCategory, CatalogItem } from "@/lib/types";
import { useCoachCompetitionLabels } from "@/lib/use-coach-competition-labels";

type Gender = "MALE" | "FEMALE";
type CategoryLink = {
  linkId: string;
  editionId: string;
  eventId: number;
  divisionId: number;
  categoryId: number;
  gender: Gender;
  status: "AVAILABLE" | "EXPIRED" | "REVOKED" | "EDITION_CLOSED";
  available: boolean;
  expiresAt: string;
  createdAt: string;
  revokedAt?: string | null;
};
type CreatedLink = { link: CategoryLink; accessUrl: string };

type GoldReport = { prepared: boolean; teams: { id: string; name: string }[] };
const titleFor = (gender: Gender) => gender === "MALE" ? "Paulista" : "Paulista Feminino";

export default function CoachCategoryLinksPage() {
  const [editions, setEditions] = useState<AdminAwardEdition[]>([]);
  const [editionId, setEditionId] = useState("");
  const [gender, setGender] = useState<Gender>("MALE");
  const [divisions, setDivisions] = useState<CatalogItem[]>([]);
  const [divisionId, setDivisionId] = useState("");
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [links, setLinks] = useState<CategoryLink[]>([]);
  const [expiresAt, setExpiresAt] = useState("");
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [goldPrepared, setGoldPrepared] = useState(false);
  const edition = editions.find((value) => value.id === editionId);
  const competitionLabel = useCoachCompetitionLabels(links.map((link) => ({
    season: editions.find((item) => item.id === link.editionId)?.season ?? 0,
    ...link,
  })));
  const category = categories.find((value) => String(value.id) === categoryId);

  async function loadLinks(id: string) {
    return clientApi<CategoryLink[]>(`/api/admin/awards/editions/${id}/coach-category-links`);
  }

  useEffect(() => {
    clientApi<AdminAwardEdition[]>("/api/admin/awards/editions")
      .then((data) => { setEditions(data); if (data[0]) setEditionId(data[0].id); })
      .catch((e) => setError(e instanceof Error ? e.message : "Não foi possível carregar as edições."));
  }, []);
  useEffect(() => {
    if (!editionId) return;
    loadLinks(editionId)
      .then(setLinks)
      .catch((e) => setError(e instanceof Error ? e.message : "Falha ao listar os links."));
  }, [editionId]);
  useEffect(() => {
    if (!edition) return;
    const query = new URLSearchParams({ season: String(edition.season), title: titleFor(gender) });
    clientApi<CatalogItem[]>(`/api/catalog/divisions?${query}`)
      .then(setDivisions).catch((e) => setError(e instanceof Error ? e.message : "Falha ao carregar divisões."));
  }, [edition, gender]);
  useEffect(() => {
    if (!edition || !divisionId) return;
    const query = new URLSearchParams({ season: String(edition.season), title: titleFor(gender), divisionId });
    clientApi<CatalogCategory[]>(`/api/catalog/categories?${query}`)
      .then(setCategories).catch((e) => setError(e instanceof Error ? e.message : "Falha ao carregar categorias."));
  }, [edition, divisionId, gender]);
  useEffect(() => {
    if (!editionId || !category || !divisionId) return;
    let cancelled = false;
    const query = new URLSearchParams({
      eventId: String(category.eventId), divisionId, categoryId,
    });
    clientApi<GoldReport>(`/api/admin/awards/editions/${editionId}/gold-eligibility?${query}`)
      .then((data) => { if (!cancelled) setGoldPrepared(data.prepared && data.teams.length > 0); })
      .catch(() => { if (!cancelled) setGoldPrepared(false); });
    return () => { cancelled = true; };
  }, [editionId, category, categoryId, divisionId]);

  async function create() {
    if (!editionId || !category || !divisionId || !expiresAt || !goldPrepared) return;
    setBusy(true); setError(""); setGeneratedUrl("");
    try {
      const result = await clientApi<CreatedLink>(`/api/admin/awards/editions/${editionId}/coach-category-links`, {
        method: "POST",
        body: JSON.stringify({
          eventId: Number(category.eventId), divisionId: Number(divisionId),
          categoryId: Number(categoryId), gender, expiresAt: new Date(expiresAt).toISOString(),
        }),
      });
      setGeneratedUrl(result.accessUrl);
      setLinks(await loadLinks(editionId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível gerar o convite.");
    } finally { setBusy(false); }
  }

  async function revoke(link: CategoryLink) {
    if (!window.confirm("Revogar este link? O link deixará de funcionar imediatamente.")) return;
    setBusy(true); setError("");
    try {
      await clientApi(`/api/admin/awards/editions/${editionId}/coach-category-links/${link.linkId}/revoke`, { method: "POST" });
      setGeneratedUrl("");
      setLinks(await loadLinks(editionId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível revogar o convite.");
    } finally { setBusy(false); }
  }

  return <main className="grid gap-6">
    <header>
      <Link href="/app/admin/premio-dna/juri-tecnico" className="text-sm text-cyan">Voltar ao júri técnico</Link>
      <h1 className="display-title mt-3 text-3xl">Convites exclusivos por categoria</h1>
      <Link className="btn-primary mt-3 w-fit" href="/app/admin/premio-dna/juri-tecnico/solicitacoes">Analisar inscrições dos treinadores</Link>
      <p className="mt-2 text-sm text-muted">Emita e revogue convites exclusivos por categoria e acompanhe os pedidos de credenciamento.</p>
    </header>
    {error && <p role="alert" className="rounded-xl border border-coral/25 p-4 text-sm text-[#ffb195]">{error}</p>}
    <section className="grid gap-4 rounded-3xl border border-white/8 bg-panel p-5 sm:p-6">
      <label className="grid gap-1.5 text-sm">Edição
        <select className="field" value={editionId} onChange={(e) => { setEditionId(e.target.value); setGeneratedUrl(""); setDivisionId(""); setCategoryId(""); setGoldPrepared(false); }}>
          {editions.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
      </label>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="grid gap-1.5 text-sm">Modalidade
          <select className="field" value={gender} onChange={(e) => { setGender(e.target.value as Gender); setDivisionId(""); setCategoryId(""); setGoldPrepared(false); setDivisions([]); setCategories([]); }}>
            <option value="MALE">Masculino</option><option value="FEMALE">Feminino</option>
          </select>
        </label>
        <label className="grid gap-1.5 text-sm">Divisão
          <select className="field" value={divisionId} onChange={(e) => { setDivisionId(e.target.value); setCategoryId(""); setGoldPrepared(false); setCategories([]); }}>
            <option value="">Selecione a divisão</option>
            {divisions.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm">Categoria competitiva
          <select className="field" value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setGoldPrepared(false); }}>
            <option value="">Selecione a categoria</option>
            {categories.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </label>
      </div>
      <p className="text-sm text-muted">{goldPrepared ? "Chave Ouro preparada e congelada para esta categoria." : "Verifique ou prepare a Chave Ouro desta categoria antes de emitir convites."}</p>
      <label className="grid gap-1.5 text-sm">Validade do convite (data e hora local)
        <input className="field" type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
      </label>
      <button className="btn-primary" disabled={busy || !goldPrepared || !expiresAt || !category} onClick={() => void create()}>
        {busy ? "Processando..." : "Gerar link exclusivo"}
      </button>
      {generatedUrl && <div className="grid gap-2 rounded-xl border border-cyan/25 p-4">
        <p className="text-sm font-bold">Copie agora: o endereço completo não será exibido novamente.</p>
        <input className="field" aria-label="Novo link exclusivo" readOnly value={generatedUrl} onFocus={(e) => e.currentTarget.select()} />
        <button className="btn-ghost" onClick={() => void navigator.clipboard.writeText(generatedUrl)}>Copiar link</button>
      </div>}
    </section>
    <section className="grid gap-3 rounded-3xl border border-white/8 bg-panel p-5 sm:p-6">
      <h2 className="text-xl font-bold">Convites desta edição</h2>
      {links.length === 0 && <p className="text-sm text-muted">Nenhum convite por categoria emitido.</p>}
      {links.map((link) => <div key={link.linkId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/8 p-4">
        <div className="text-sm">
          <strong>{link.gender === "MALE" ? "Masculino" : "Feminino"} • {competitionLabel({ ...link, season: editions.find((item) => item.id === link.editionId)?.season ?? 0 })}</strong>
          <p className="mt-1 text-xs text-muted">Status: {link.status} • Válido até {new Date(link.expiresAt).toLocaleString("pt-BR")}</p>
        </div>
        {link.status !== "REVOKED" && <button className="btn-ghost" disabled={busy} onClick={() => void revoke(link)}>Revogar</button>}
      </div>)}
    </section>
  </main>;
}
