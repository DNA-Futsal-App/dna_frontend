"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileVideo2,
  Link2,
  LoaderCircle,
  Plus,
  Send,
  Trash2,
  UploadCloud,
} from "lucide-react";

import { useProfile } from "@/components/profile-context";
import { clientApi } from "@/lib/client-api";
import type { CatalogCategory, CatalogItem, Team } from "@/lib/types";
import type {
  AwardContestCategory,
  AwardRegistrationContext,
  AwardRegistrationEntryResponse,
  AwardRegistrationResponse,
  AwardUploadTicketResponse,
  MediaSourceType,
} from "@/lib/award-registration-types";

type VideoInfo = {
  durationSeconds: number;
  width: number;
  height: number;
  willResize: boolean;
};

type MediaEntry = {
  localId: string;
  contestCategory: AwardContestCategory | "";
  sourceType: MediaSourceType;
  externalUrl: string;
  file: File | null;
  fileInfo: VideoInfo | null;
  fileError: string;
  uploadProgress?: number;
  processing?: boolean;
};

function makeEntry(index: number): MediaEntry {
  return {
    localId: `entry-${index}`,
    contestCategory: "",
    sourceType: "UPLOAD",
    externalUrl: "",
    file: null,
    fileInfo: null,
    fileError: "",
  };
}

export default function AwardRegistrationPage() {
  const { profile } = useProfile();
  const [context, setContext] = useState<AwardRegistrationContext | null>(null);
  const [divisions, setDivisions] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  const [athleteName, setAthleteName] = useState("");
  const [cpf, setCpf] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [entries, setEntries] = useState<MediaEntry[]>([makeEntry(1)]);
  const nextEntry = useRef(2);

  const [draft, setDraft] = useState<AwardRegistrationResponse | null>(null);
  const [finished, setFinished] = useState<AwardRegistrationResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const locked = Boolean(draft);

  useEffect(() => {
    clientApi<AwardRegistrationContext>("/api/awards/registrations/context")
      .then(setContext)
      .catch((err) =>
        setError(
          err instanceof Error
            ? err.message
            : "Não foi possível carregar as regras da inscrição.",
        ),
      );

    clientApi<CatalogItem[]>("/api/catalog/divisions")
      .then(setDivisions)
      .catch(() => setDivisions([]));
  }, []);

  useEffect(() => {
    if (!profile || locked) return;
    setDivisionId((current) => current || profile.divisionId || "");
    setCategoryId((current) => current || profile.categoryId || "");
    setTeamId((current) => current || profile.teamId || "");
  }, [profile, locked]);

  useEffect(() => {
    if (!divisionId) {
      setCategories([]);
      return;
    }

    let active = true;
    clientApi<CatalogCategory[]>(
      `/api/catalog/categories?divisionId=${encodeURIComponent(divisionId)}`,
    )
      .then((result) => active && setCategories(result))
      .catch(() => active && setCategories([]));

    return () => {
      active = false;
    };
  }, [divisionId]);

  const sportsCategory = categories.find(
    (item) => String(item.id) === categoryId,
  );
  const eventId = sportsCategory?.eventId ?? null;

  useEffect(() => {
    if (!eventId) {
      setTeams([]);
      return;
    }

    let active = true;
    clientApi<Team[]>(
      `/api/catalog/teams?eventId=${encodeURIComponent(String(eventId))}`,
    )
      .then((result) => active && setTeams(result))
      .catch(() => active && setTeams([]));

    return () => {
      active = false;
    };
  }, [eventId]);

  const usedContestCategories = useMemo(
    () =>
      new Set(
        entries
          .map((entry) => entry.contestCategory)
          .filter((value): value is AwardContestCategory => Boolean(value)),
      ),
    [entries],
  );

  function patchEntry(localId: string, patch: Partial<MediaEntry>) {
    setEntries((current) =>
      current.map((entry) =>
        entry.localId === localId ? { ...entry, ...patch } : entry,
      ),
    );
  }

  async function pickVideo(localId: string, file: File | null) {
    if (!file || !context) {
      patchEntry(localId, { file: null, fileInfo: null, fileError: "" });
      return;
    }

    try {
      const info = await inspectVideo(file, context);
      patchEntry(localId, { file, fileInfo: info, fileError: "" });
    } catch (err) {
      patchEntry(localId, {
        file: null,
        fileInfo: null,
        fileError:
          err instanceof Error
            ? err.message
            : "Não foi possível validar o vídeo.",
      });
    }
  }

  function validate() {
    if (!athleteName.trim()) throw new Error("Informe o nome do atleta.");
    if (!isValidCpf(cpf)) throw new Error("Informe um CPF válido do representante.");
    if (!divisionId || !categoryId || !teamId) {
      throw new Error("Selecione divisão, categoria e time do atleta.");
    }
    if (!profile?.childInstagram) {
      throw new Error("O Instagram do atleta precisa estar preenchido no perfil.");
    }

    const chosen = entries.map((entry) => entry.contestCategory);
    if (chosen.some((value) => !value)) {
      throw new Error("Selecione a categoria de prêmio em todos os blocos.");
    }
    if (new Set(chosen).size !== chosen.length) {
      throw new Error("A mesma categoria do prêmio não pode ser repetida.");
    }

    for (const entry of entries) {
      if (entry.sourceType === "LINK") {
        if (!isValidHttpsUrl(entry.externalUrl)) {
          throw new Error("Informe um link HTTPS válido para cada vídeo externo.");
        }
      } else if (!entry.file || !entry.fileInfo || entry.fileError) {
        throw new Error("Selecione um vídeo válido para cada categoria com upload.");
      }
    }
  }

  async function createDraft() {
    const created = await clientApi<AwardRegistrationResponse>(
      "/api/awards/registrations",
      {
        method: "POST",
        body: JSON.stringify({
          athleteName: athleteName.trim(),
          representativeCpf: digitsOnly(cpf),
          divisionId: Number(divisionId),
          categoryId: Number(categoryId),
          teamId,
          entries: entries.map((entry) => ({
            contestCategory: entry.contestCategory,
            sourceType: entry.sourceType,
            externalUrl:
              entry.sourceType === "LINK" ? entry.externalUrl.trim() : null,
          })),
        }),
      },
    );

    setDraft(created);
    return created;
  }

  async function uploadOne(
    registration: AwardRegistrationResponse,
    localEntry: MediaEntry,
    backendEntry: AwardRegistrationEntryResponse,
  ) {
    if (!localEntry.file) throw new Error("Selecione novamente o vídeo.");

    patchEntry(localEntry.localId, {
      processing: true,
      uploadProgress: 0,
      fileError: "",
    });

    try {
      const ticket = await clientApi<AwardUploadTicketResponse>(
        `/api/awards/registrations/${registration.id}/entries/${backendEntry.id}/upload-ticket`,
        {
          method: "POST",
          body: JSON.stringify({
            sizeBytes: localEntry.file.size,
            contentType: localEntry.file.type || "application/octet-stream",
          }),
        },
      );

      await uploadToOracle(ticket.uploadUrl, localEntry.file, (progress) =>
        patchEntry(localEntry.localId, { uploadProgress: progress }),
      );

      await clientApi(
        `/api/awards/registrations/${registration.id}/entries/${backendEntry.id}/complete-upload`,
        { method: "POST" },
      );

      patchEntry(localEntry.localId, {
        processing: false,
        uploadProgress: 100,
      });
    } catch (err) {
      patchEntry(localEntry.localId, {
        processing: false,
        fileError:
          err instanceof Error ? err.message : "Falha ao processar o vídeo.",
      });
      throw err;
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!context || !profile || submitting) return;

    setError("");

    try {
      if (!draft) validate();
      setSubmitting(true);

      const registration = draft ?? (await createDraft());
      const backendEntries = new Map(
        registration.entries.map((entry) => [entry.contestCategory, entry]),
      );

      for (const localEntry of entries) {
        if (localEntry.sourceType !== "UPLOAD" || !localEntry.contestCategory) continue;
        const backendEntry = backendEntries.get(localEntry.contestCategory);
        if (!backendEntry) throw new Error("Categoria de mídia não encontrada no rascunho.");
        if (backendEntry.mediaStatus === "READY") continue;
        await uploadOne(registration, localEntry, backendEntry);
      }

      const result = await clientApi<AwardRegistrationResponse>(
        `/api/awards/registrations/${registration.id}/submit`,
        { method: "POST" },
      );
      setFinished(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir a inscrição.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!profile || !context) {
    return (
      <div className="flex min-h-72 items-center justify-center">
        <LoaderCircle className="size-9 animate-spin text-cyan" />
      </div>
    );
  }

  if (!profile.childInstagram) {
    return (
      <section className="surface mx-auto max-w-2xl rounded-[1.75rem] p-6 sm:p-8">
        <AlertTriangle className="size-10 text-amber" />
        <p className="eyebrow mt-5">Prêmio DNA Futsal</p>
        <h1 className="display-title mt-2 text-4xl font-black">Complete o perfil do atleta.</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          O Instagram do atleta será usado para identificar a inscrição e precisa estar preenchido antes de continuar.
        </p>
        <Link href="/app/perfil" className="btn-primary mt-6">Ir para meu perfil</Link>
      </section>
    );
  }

  if (finished) {
    return (
      <section className="surface mx-auto max-w-2xl rounded-[1.75rem] p-6 text-center sm:p-9">
        <CheckCircle2 className="mx-auto size-14 text-cyan" />
        <p className="eyebrow mt-5 justify-center">Inscrição registrada</p>
        <h1 className="display-title mt-3 text-4xl font-black sm:text-5xl">Atleta inscrito!</h1>
        <p className="mt-4 text-muted">
          Número da inscrição: <strong className="text-ivory">#{String(finished.registrationNumber).padStart(6, "0")}</strong>
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Os vídeos permanecem vinculados a esta inscrição e poderão ser substituídos enquanto o período estiver aberto.
        </p>
        <Link href="/app" className="btn-ghost mt-7">Voltar ao aplicativo</Link>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-7">
        <p className="eyebrow">Prêmio DNA Futsal</p>
        <h1 className="display-title mt-2 text-4xl font-black leading-none sm:text-5xl">Inscrição do atleta.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
          Informe os dados do atleta, escolha de uma a quatro categorias e envie um link ou vídeo para cada uma.
        </p>
      </header>

      {draft ? (
        <div className="mb-5 rounded-2xl border border-amber/20 bg-amber/5 p-4 text-sm text-muted">
          <strong className="text-amber">Rascunho #{String(draft.registrationNumber).padStart(6, "0")}</strong>
          <p className="mt-1">Os dados principais foram reservados. Se um upload falhar, tente novamente sem gerar outra inscrição.</p>
        </div>
      ) : null}

      <form onSubmit={submit} className="grid gap-5">
        <section className="surface rounded-[1.75rem] p-5 sm:p-7">
          <h2 className="text-lg font-black text-ivory">Atleta e representante</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-bold">
              Nome completo do atleta
              <input className="field" value={athleteName} onChange={(e) => setAthleteName(e.target.value)} maxLength={150} required disabled={locked} placeholder="Nome do atleta" />
            </label>
            <label className="grid gap-1.5 text-sm font-bold">
              CPF do representante
              <input className="field" value={cpf} onChange={(e) => setCpf(formatCpf(e.target.value))} inputMode="numeric" autoComplete="off" maxLength={14} required disabled={locked} placeholder="000.000.000-00" />
            </label>
          </div>
          <label className="mt-4 grid gap-1.5 text-sm font-bold">
            Instagram do atleta
            <input className="field" value={profile.childInstagram} readOnly />
            <small className="font-normal text-muted">Obtido do perfil do representante.</small>
          </label>
        </section>

        <section className="surface rounded-[1.75rem] p-5 sm:p-7">
          <h2 className="text-lg font-black text-ivory">Contexto esportivo</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-bold">
              Divisão
              <select className="field" value={divisionId} disabled={locked} required onChange={(e) => { setDivisionId(e.target.value); setCategoryId(""); setTeamId(""); setCategories([]); setTeams([]); }}>
                <option value="">Selecione</option>
                {divisions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-bold">
              Categoria
              <select className="field" value={categoryId} disabled={locked || !divisionId} required onChange={(e) => { setCategoryId(e.target.value); setTeamId(""); setTeams([]); }}>
                <option value="">Selecione</option>
                {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
          </div>
          <label className="mt-4 grid gap-1.5 text-sm font-bold">
            Time do atleta
            <select className="field" value={teamId} disabled={locked || !eventId} required onChange={(e) => setTeamId(e.target.value)}>
              <option value="">Selecione</option>
              {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
            </select>
          </label>
        </section>

        <section className="surface rounded-[1.75rem] p-5 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-ivory">Categorias do prêmio</h2>
              <p className="mt-1 text-xs text-muted">Até quatro categorias, cada uma com sua própria mídia.</p>
            </div>
            <span className="rounded-full border border-cyan/15 bg-cyan/6 px-3 py-1.5 text-xs font-black text-cyan">{entries.length}/4</span>
          </div>

          <div className="mt-5 grid gap-4">
            {entries.map((entry, index) => (
              <article key={entry.localId} className="rounded-2xl border border-white/8 bg-night/35 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-sm text-ivory">Categoria {index + 1}</strong>
                  {entries.length > 1 && !locked ? (
                    <button type="button" onClick={() => setEntries((current) => current.filter((item) => item.localId !== entry.localId))} className="inline-flex size-9 items-center justify-center rounded-full border border-white/10 text-muted hover:border-coral/30 hover:text-coral" aria-label={`Remover categoria ${index + 1}`}>
                      <Trash2 className="size-4" />
                    </button>
                  ) : null}
                </div>

                <label className="mt-4 grid gap-1.5 text-sm font-bold">
                  Categoria
                  <select className="field" value={entry.contestCategory} disabled={locked} required onChange={(e) => patchEntry(entry.localId, { contestCategory: e.target.value as AwardContestCategory })}>
                    <option value="">Selecione</option>
                    {context.contestCategories.map((option) => (
                      <option key={option.code} value={option.code} disabled={usedContestCategories.has(option.code) && entry.contestCategory !== option.code}>{option.label}</option>
                    ))}
                  </select>
                </label>

                <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-black/15 p-1.5">
                  <button type="button" disabled={locked} onClick={() => patchEntry(entry.localId, { sourceType: "UPLOAD", externalUrl: "" })} className={`flex min-h-11 items-center justify-center gap-2 rounded-lg text-sm font-black ${entry.sourceType === "UPLOAD" ? "bg-cyan text-ink" : "text-muted hover:text-ivory"}`}>
                    <UploadCloud className="size-4" /> Upload
                  </button>
                  <button type="button" disabled={locked} onClick={() => patchEntry(entry.localId, { sourceType: "LINK", file: null, fileInfo: null, fileError: "" })} className={`flex min-h-11 items-center justify-center gap-2 rounded-lg text-sm font-black ${entry.sourceType === "LINK" ? "bg-amber text-ink" : "text-muted hover:text-ivory"}`}>
                    <Link2 className="size-4" /> Link externo
                  </button>
                </div>

                {entry.sourceType === "LINK" ? (
                  <label className="mt-4 grid gap-1.5 text-sm font-bold">
                    Link do vídeo
                    <input className="field" type="url" value={entry.externalUrl} disabled={locked} required placeholder="https://youtube.com/... ou https://drive.google.com/..." onChange={(e) => patchEntry(entry.localId, { externalUrl: e.target.value })} />
                  </label>
                ) : (
                  <div className="mt-4">
                    <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-cyan/25 bg-cyan/4 px-4 py-5 text-center hover:border-cyan/50">
                      <FileVideo2 className="size-7 text-cyan" />
                      <strong className="mt-2 text-sm text-ivory">{entry.file ? entry.file.name : "Escolher vídeo"}</strong>
                      <span className="mt-1 text-xs text-muted">Até {context.maxDurationSeconds}s • máximo {formatBytes(context.maxUploadBytes)} antes da compactação</span>
                      <input className="sr-only" type="file" accept="video/*" disabled={entry.processing} onChange={(e) => void pickVideo(entry.localId, e.target.files?.[0] ?? null)} />
                    </label>

                    {entry.fileInfo ? (
                      <div className="mt-3 rounded-xl border border-white/8 bg-black/15 px-3.5 py-3 text-xs text-muted">
                        <strong className="text-cyan">Vídeo validado</strong> • {entry.fileInfo.durationSeconds.toFixed(1)}s • {entry.fileInfo.width}×{entry.fileInfo.height}
                        {entry.fileInfo.willResize ? <p className="mt-1 text-amber">Será reduzido automaticamente para no máximo 720p.</p> : null}
                      </div>
                    ) : null}

                    {entry.uploadProgress != null ? (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-muted"><span>{entry.processing && entry.uploadProgress >= 100 ? "Validando e compactando..." : "Enviando..."}</span><strong className="text-ivory">{Math.round(entry.uploadProgress)}%</strong></div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full bg-cyan" style={{ width: `${Math.min(100, entry.uploadProgress)}%` }} /></div>
                      </div>
                    ) : null}

                    {entry.fileError ? <p className="mt-3 rounded-xl border border-coral/25 bg-coral/8 px-3.5 py-3 text-sm text-[#ffb195]" role="alert">{entry.fileError}</p> : null}
                  </div>
                )}
              </article>
            ))}
          </div>

          {entries.length < 4 && !locked ? (
            <button type="button" onClick={() => setEntries((current) => [...current, makeEntry(nextEntry.current++)])} className="btn-ghost mt-4 w-full border-dashed"><Plus className="size-4" />Adicionar mais uma categoria</button>
          ) : null}
        </section>

        <section className="rounded-2xl border border-amber/20 bg-amber/5 p-4 text-sm leading-relaxed text-muted">
          A validação do navegador é apenas a primeira barreira. O backend valida novamente com FFprobe, recusa arquivos que não sejam vídeo ou ultrapassem um minuto e converte tudo para MP4/H.264 em no máximo 720p antes do armazenamento definitivo.
        </section>

        {error ? <p className="rounded-xl border border-coral/25 bg-coral/8 px-4 py-3 text-sm text-[#ffb195]" role="alert">{error}</p> : null}

        <button className="btn-primary w-full" disabled={submitting || entries.some((entry) => entry.processing)}>
          {submitting ? <LoaderCircle className="size-5 animate-spin" /> : <Send className="size-5" />}
          {submitting ? "Processando inscrição..." : draft ? "Tentar concluir novamente" : "Registrar inscrição"}
        </button>
      </form>
    </div>
  );
}

async function inspectVideo(file: File, context: AwardRegistrationContext): Promise<VideoInfo> {
  if (!file.type.startsWith("video/")) {
    throw new Error("O arquivo selecionado não é um vídeo. Escolha um arquivo de vídeo.");
  }
  if (file.size > context.maxUploadBytes) {
    throw new Error(`O arquivo excede o limite de ${formatBytes(context.maxUploadBytes)} antes da compactação.`);
  }

  const url = URL.createObjectURL(file);
  try {
    const metadata = await new Promise<{ duration: number; width: number; height: number }>((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => resolve({ duration: video.duration, width: video.videoWidth, height: video.videoHeight });
      video.onerror = () => reject(new Error("O navegador não reconheceu este arquivo como um vídeo válido."));
      video.src = url;
    });

    if (!Number.isFinite(metadata.duration) || metadata.duration <= 0) throw new Error("Não foi possível determinar a duração do vídeo.");
    if (metadata.duration > context.maxDurationSeconds + 0.05) throw new Error(`O vídeo deve ter no máximo ${context.maxDurationSeconds} segundos.`);
    if (!metadata.width || !metadata.height) throw new Error("Não foi possível identificar a resolução do vídeo.");

    const landscape = metadata.width >= metadata.height;
    return {
      durationSeconds: metadata.duration,
      width: metadata.width,
      height: metadata.height,
      willResize: landscape
        ? metadata.width > 1280 || metadata.height > 720
        : metadata.width > 720 || metadata.height > 1280,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function uploadToOracle(uploadUrl: string, file: File, onProgress: (progress: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", uploadUrl, true);
    request.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    request.upload.onprogress = (event) => event.lengthComputable && onProgress((event.loaded / event.total) * 100);
    request.onload = () => request.status >= 200 && request.status < 300 ? (onProgress(100), resolve()) : reject(new Error("A Oracle não aceitou o upload do vídeo."));
    request.onerror = () => reject(new Error("Falha de conexão durante o upload do vídeo."));
    request.send(file);
  });
}

function digitsOnly(value: string) { return value.replace(/\D/g, ""); }
function formatCpf(value: string) {
  return digitsOnly(value).slice(0, 11).replace(/^(\d{3})(\d)/, "$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1-$2");
}
function isValidCpf(value: string) {
  const cpf = digitsOnly(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digit = (length: number) => {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += Number(cpf[i]) * (length + 1 - i);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}
function isValidHttpsUrl(value: string) { try { return new URL(value).protocol === "https:"; } catch { return false; } }
function formatBytes(bytes: number) { return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${Math.ceil(bytes / (1024 * 1024))} MB`; }
