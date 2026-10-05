/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  Clock3,
  ExternalLink,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import {
  ClientApiError,
  clientApi,
} from "@/lib/client-api";
import type {
  AdminAwardEdition,
  AdminAwardMediaTicket,
  AdminAwardRegistration,
  AdminAwardRegistrationEntry,
  AdminAwardRegistrationPage,
  AdminAwardRegistrationReviewStatus,
} from "@/lib/admin-awards-types";

type ReviewFilter =
  | "ALL"
  | AdminAwardRegistrationReviewStatus;

export default function AwardRegistrationsAdminPage() {
  const [editions, setEditions] =
    useState<AdminAwardEdition[]>([]);
  const [editionId, setEditionId] =
    useState("");
  const [filter, setFilter] =
    useState<ReviewFilter>("PENDING_REVIEW");
  const [page, setPage] =
    useState(0);
  const [data, setData] =
    useState<AdminAwardRegistrationPage | null>(null);
  const [loading, setLoading] =
    useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [forbidden, setForbidden] =
    useState(false);
  const [error, setError] =
    useState("");
  const [busyEntryId, setBusyEntryId] =
    useState<string | null>(null);
  const [rejecting, setRejecting] =
    useState<{
      registration: AdminAwardRegistration;
      entry: AdminAwardRegistrationEntry;
    } | null>(null);
  const [rejectionReason, setRejectionReason] =
    useState("");

  useEffect(() => {
    let active = true;

    clientApi<AdminAwardEdition[]>(
      "/api/admin/awards/editions",
    )
      .then((result) => {
        if (!active) return;

        setEditions(result);
        setEditionId((current) =>
          current || result[0]?.id || "",
        );
      })
      .catch((err) => {
        if (!active) return;

        if (
          err instanceof ClientApiError &&
          err.status === 403
        ) {
          setForbidden(true);
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Não foi possível carregar as edições.",
        );
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const loadQueue = useCallback(
    async (
      targetEditionId = editionId,
      targetPage = page,
      targetFilter = filter,
    ) => {
      if (!targetEditionId) {
        return;
      }

      setRefreshing(true);
      setError("");

      try {
        const query =
          new URLSearchParams({
            page: String(targetPage),
            size: "20",
          });

        if (targetFilter !== "ALL") {
          query.set(
            "reviewStatus",
            targetFilter,
          );
        }

        const result =
          await clientApi<AdminAwardRegistrationPage>(
            `/api/admin/awards/editions/${targetEditionId}/registrations?${query.toString()}`,
          );

        setData(result);
      } catch (err) {
        if (
          err instanceof ClientApiError &&
          err.status === 403
        ) {
          setForbidden(true);
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Não foi possível carregar as candidaturas.",
        );
      } finally {
        setRefreshing(false);
      }
    },
    [
      editionId,
      filter,
      page,
    ],
  );

  useEffect(() => {
    if (!editionId || forbidden) {
      return;
    }

    void loadQueue();
  }, [
    editionId,
    filter,
    page,
    forbidden,
    loadQueue,
  ]);

  async function approve(
    registration: AdminAwardRegistration,
    entry: AdminAwardRegistrationEntry,
  ) {
    if (
      !window.confirm(
        `Aprovar a candidatura "${entry.contestCategoryLabel}" de ${registration.athleteName}?`,
      )
    ) {
      return;
    }

    setBusyEntryId(entry.id);
    setError("");

    try {
      await clientApi(
        `/api/admin/awards/registrations/${registration.id}/entries/${entry.id}/approve`,
        {
          method: "POST",
        },
      );

      await loadQueue();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível aprovar a candidatura.",
      );
    } finally {
      setBusyEntryId(null);
    }
  }

  async function reject() {
    if (!rejecting) {
      return;
    }

    const reason =
      rejectionReason.trim();

    if (reason.length < 5) {
      setError(
        "Informe um motivo de reprovação com pelo menos 5 caracteres.",
      );
      return;
    }

    setBusyEntryId(
      rejecting.entry.id,
    );
    setError("");

    try {
      await clientApi(
        `/api/admin/awards/registrations/${rejecting.registration.id}/entries/${rejecting.entry.id}/reject`,
        {
          method: "POST",
          body: JSON.stringify({
            reason,
          }),
        },
      );

      setRejecting(null);
      setRejectionReason("");
      await loadQueue();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível reprovar a candidatura.",
      );
    } finally {
      setBusyEntryId(null);
    }
  }

  async function loadUploadedMedia(
    registration: AdminAwardRegistration,
    entry: AdminAwardRegistrationEntry,
  ) {
    const ticket =
      await clientApi<AdminAwardMediaTicket>(
        `/api/admin/awards/registrations/${registration.id}/entries/${entry.id}/media-ticket`,
        {
          method: "POST",
        },
      );

    return ticket.url;
  }

  if (loading) {
    return (
      <div className="flex min-h-80 items-center justify-center">
        <LoaderCircle className="size-9 animate-spin text-cyan" />
      </div>
    );
  }

  if (forbidden) {
    return (
      <section className="rounded-3xl border border-coral/20 bg-panel p-6 sm:p-8">
        <ShieldCheck className="size-10 text-coral" />
        <h1 className="display-title mt-4 text-3xl">
          Acesso administrativo
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
          Sua conta não possui a permissão ADMIN necessária
          para analisar candidaturas.
        </p>
      </section>
    );
  }

  const selectedEdition =
    editions.find(
      (edition) =>
        edition.id === editionId,
    );

  const filters: Array<{
    value: ReviewFilter;
    label: string;
    count?: number;
  }> = [
    {
      value: "PENDING_REVIEW",
      label: "Pendentes",
      count: data?.pendingReview,
    },
    {
      value: "APPROVED",
      label: "Aprovadas",
      count: data?.approved,
    },
    {
      value: "REJECTED",
      label: "Reprovadas",
      count: data?.rejected,
    },
    {
      value: "ALL",
      label: "Todas",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-6">
        <Link
          href="/app/admin/premio-dna"
          className="inline-flex items-center gap-2 text-sm font-black text-muted hover:text-ivory"
        >
          <ArrowLeft className="size-4" />
          Voltar ao painel do prêmio
        </Link>

        <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">
              <ShieldCheck className="size-4" />
              Moderação
            </p>
            <h1 className="display-title mt-2 text-4xl font-black sm:text-5xl">
              Candidaturas
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
              Analise cada categoria e vídeo individualmente.
              Enquanto as inscrições estiverem abertas, uma mídia alterada
              pelo responsável volta automaticamente para análise.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="grid min-w-64 gap-1.5 text-sm font-bold">
              Edição
              <select
                className="field"
                value={editionId}
                onChange={(event) => {
                  setPage(0);
                  setEditionId(
                    event.target.value,
                  );
                }}
              >
                {editions.map(
                  (edition) => (
                    <option
                      key={edition.id}
                      value={edition.id}
                    >
                      {edition.name}
                    </option>
                  ),
                )}
              </select>
            </label>

            <button
              type="button"
              className="btn-ghost"
              disabled={refreshing}
              onClick={() =>
                void loadQueue()
              }
            >
              <RefreshCw
                className={`size-4 ${
                  refreshing
                    ? "animate-spin"
                    : ""
                }`}
              />
              Atualizar
            </button>
          </div>
        </div>

        {selectedEdition ? (
          <p className="mt-3 text-xs font-bold text-muted">
            {selectedEdition.season} •{" "}
            {selectedEdition.name}
          </p>
        ) : null}
      </header>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <CounterCard
          label="Aguardando análise"
          value={data?.pendingReview ?? 0}
          tone="amber"
        />
        <CounterCard
          label="Aprovadas"
          value={data?.approved ?? 0}
          tone="cyan"
        />
        <CounterCard
          label="Reprovadas"
          value={data?.rejected ?? 0}
          tone="coral"
        />
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {filters.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => {
              setPage(0);
              setFilter(item.value);
            }}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-black transition ${
              filter === item.value
                ? "border-cyan/30 bg-cyan/10 text-cyan"
                : "border-white/8 bg-panel text-muted hover:text-ivory"
            }`}
          >
            {item.label}
            {item.count != null
              ? ` (${item.count})`
              : ""}
          </button>
        ))}
      </div>

      {error ? (
        <div
          className="mb-5 rounded-xl border border-coral/25 bg-coral/8 px-4 py-3 text-sm text-[#ffb195]"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {refreshing && !data ? (
        <div className="flex min-h-64 items-center justify-center">
          <LoaderCircle className="size-8 animate-spin text-cyan" />
        </div>
      ) : data?.items.length ? (
        <div className="grid gap-5">
          {data.items.map(
            (registration) => (
              <RegistrationCard
                key={registration.id}
                registration={registration}
                busyEntryId={busyEntryId}
                onApprove={approve}
                onReject={(entry) => {
                  setError("");
                  setRejectionReason("");
                  setRejecting({
                    registration,
                    entry,
                  });
                }}
                onLoadUploadedMedia={
                  loadUploadedMedia
                }
              />
            ),
          )}
        </div>
      ) : (
        <section className="surface rounded-[1.75rem] p-8 text-center">
          <Check className="mx-auto size-10 text-muted" />
          <h2 className="mt-4 text-xl font-black">
            Nenhuma candidatura neste filtro.
          </h2>
          <p className="mt-2 text-sm text-muted">
            Altere o filtro ou atualize a fila.
          </p>
        </section>
      )}

      {data && data.totalPages > 1 ? (
        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            className="btn-ghost"
            disabled={page <= 0 || refreshing}
            onClick={() =>
              setPage((current) =>
                Math.max(
                  0,
                  current - 1,
                ),
              )
            }
          >
            Anterior
          </button>

          <span className="text-sm font-bold text-muted">
            Página {data.page + 1} de{" "}
            {data.totalPages}
          </span>

          <button
            type="button"
            className="btn-ghost"
            disabled={
              page + 1 >=
                data.totalPages ||
              refreshing
            }
            onClick={() =>
              setPage((current) =>
                current + 1,
              )
            }
          >
            Próxima
          </button>
        </div>
      ) : null}

      {rejecting ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reject-title"
        >
          <div className="surface w-full max-w-xl rounded-[1.75rem] p-6 sm:p-7">
            <XCircle className="size-10 text-coral" />

            <h2
              id="reject-title"
              className="display-title mt-4 text-3xl font-black"
            >
              Reprovar candidatura
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-muted">
              {rejecting.registration.athleteName} •{" "}
              {rejecting.entry.contestCategoryLabel}
            </p>

            <label className="mt-6 grid gap-1.5 text-sm font-bold">
              Motivo da reprovação
              <textarea
                className="field min-h-32 resize-y"
                value={rejectionReason}
                minLength={5}
                maxLength={1000}
                autoFocus
                placeholder="Explique objetivamente por que esta candidatura não foi aprovada."
                onChange={(event) =>
                  setRejectionReason(
                    event.target.value,
                  )
                }
              />
              <span className="text-right text-xs font-normal text-muted">
                {rejectionReason.length}/1000
              </span>
            </label>

            <p className="mt-3 text-xs leading-relaxed text-muted">
              O responsável receberá este motivo por e-mail
              e também poderá consultá-lo em “Minha inscrição”.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                className="btn-ghost"
                disabled={
                  busyEntryId ===
                  rejecting.entry.id
                }
                onClick={() => {
                  setRejecting(null);
                  setRejectionReason("");
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-coral px-4 text-sm font-black text-white disabled:opacity-50"
                disabled={
                  busyEntryId ===
                    rejecting.entry.id ||
                  rejectionReason.trim()
                    .length < 5
                }
                onClick={() =>
                  void reject()
                }
              >
                {busyEntryId ===
                rejecting.entry.id ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <XCircle className="size-4" />
                )}
                Confirmar reprovação
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RegistrationCard({
  registration,
  busyEntryId,
  onApprove,
  onReject,
  onLoadUploadedMedia,
}: {
  registration: AdminAwardRegistration;
  busyEntryId: string | null;
  onApprove: (
    registration: AdminAwardRegistration,
    entry: AdminAwardRegistrationEntry,
  ) => Promise<void>;
  onReject: (
    entry: AdminAwardRegistrationEntry,
  ) => void;
  onLoadUploadedMedia: (
    registration: AdminAwardRegistration,
    entry: AdminAwardRegistrationEntry,
  ) => Promise<string>;
}) {
  return (
    <article className="surface overflow-hidden rounded-[1.75rem]">
      <header className="grid gap-4 border-b border-white/7 p-5 sm:grid-cols-[1fr_auto] sm:p-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <strong className="text-xl text-ivory">
              {registration.athleteName}
            </strong>
            <span className="rounded-full border border-white/8 bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-muted">
              #{String(
                registration.registrationNumber,
              ).padStart(
                6,
                "0",
              )}
            </span>
          </div>

          <p className="mt-2 text-sm text-muted">
            {registration.teamName} •{" "}
            {registration.divisionName} •{" "}
            {registration.categoryName} •{" "}
            {registration.gender === "FEMALE"
              ? "Feminino"
              : "Masculino"}
          </p>
        </div>

        <div className="text-sm sm:text-right">
          <strong className="block text-ivory">
            {registration.representativeName}
          </strong>
          <a
            href={`mailto:${registration.representativeEmail}`}
            className="text-xs text-cyan hover:text-white"
          >
            {registration.representativeEmail}
          </a>
          {registration.submittedAt ? (
            <p className="mt-1 text-xs text-muted">
              Enviada em{" "}
              {formatDateTime(
                registration.submittedAt,
              )}
            </p>
          ) : null}
        </div>
      </header>

      <div className="grid gap-4 p-5 sm:p-6 lg:grid-cols-2">
        {registration.entries.map(
          (entry) => (
            <section
              key={entry.id}
              className="rounded-2xl border border-white/8 bg-night/30 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <ReviewBadge
                    status={entry.reviewStatus}
                  />
                  <h3 className="mt-3 text-lg font-black text-ivory">
                    {entry.contestCategoryLabel}
                  </h3>
                  <p className="mt-1 text-xs text-muted">
                    {entry.sourceType ===
                    "UPLOAD"
                      ? "Vídeo enviado à plataforma"
                      : "Link externo"}
                  </p>
                </div>

              </div>

              <AdminMediaPreview
                registration={registration}
                entry={entry}
                onLoadUploadedMedia={
                  onLoadUploadedMedia
                }
              />

              {entry.reviewStatus ===
              "PENDING_REVIEW" ? (
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={
                      busyEntryId ===
                        entry.id ||
                      entry.mediaStatus !==
                        "READY"
                    }
                    onClick={() =>
                      void onApprove(
                        registration,
                        entry,
                      )
                    }
                  >
                    {busyEntryId ===
                    entry.id ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <BadgeCheck className="size-4" />
                    )}
                    Aprovar
                  </button>

                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-coral/25 bg-coral/5 px-4 text-sm font-black text-coral disabled:opacity-50"
                    disabled={
                      busyEntryId ===
                        entry.id ||
                      entry.mediaStatus !==
                        "READY"
                    }
                    onClick={() =>
                      onReject(entry)
                    }
                  >
                    <XCircle className="size-4" />
                    Reprovar
                  </button>
                </div>
              ) : (
                <div className="mt-5 rounded-xl border border-white/7 bg-black/15 p-3 text-xs leading-relaxed text-muted">
                  {entry.reviewedAt ? (
                    <p>
                      Decisão em{" "}
                      {formatDateTime(
                        entry.reviewedAt,
                      )}
                      {entry.reviewedByName
                        ? ` por ${entry.reviewedByName}`
                        : ""}
                      .
                    </p>
                  ) : null}

                  {entry.reviewReason ? (
                    <p className="mt-2 text-[#ffb195]">
                      <strong>
                        Motivo:
                      </strong>{" "}
                      {entry.reviewReason}
                    </p>
                  ) : null}
                </div>
              )}
            </section>
          ),
        )}
      </div>
    </article>
  );
}

type ExternalMediaSource = {
  kind: "VIDEO" | "EMBED";
  src: string;
  provider: string;
  sandboxed: boolean;
};

function AdminMediaPreview({
  registration,
  entry,
  onLoadUploadedMedia,
}: {
  registration: AdminAwardRegistration;
  entry: AdminAwardRegistrationEntry;
  onLoadUploadedMedia: (
    registration: AdminAwardRegistration,
    entry: AdminAwardRegistrationEntry,
  ) => Promise<string>;
}) {
  const [uploadedUrl, setUploadedUrl] =
    useState<string | null>(null);
  const [loadingMedia, setLoadingMedia] =
    useState(false);
  const [mediaError, setMediaError] =
    useState("");

  const externalSource =
    entry.sourceType === "LINK"
      ? normalizeExternalMedia(
          entry.externalUrl,
        )
      : null;

  async function loadUpload() {
    if (
      loadingMedia ||
      uploadedUrl ||
      entry.mediaStatus !== "READY"
    ) {
      return;
    }

    setLoadingMedia(true);
    setMediaError("");

    try {
      const url =
        await onLoadUploadedMedia(
          registration,
          entry,
        );

      setUploadedUrl(url);
    } catch (err) {
      setMediaError(
        err instanceof Error
          ? err.message
          : "Não foi possível carregar o vídeo.",
      );
    } finally {
      setLoadingMedia(false);
    }
  }

  if (entry.sourceType === "UPLOAD") {
    if (entry.mediaStatus !== "READY") {
      return (
        <div className="mt-4 flex aspect-video items-center justify-center rounded-2xl border border-white/8 bg-black/25 p-5 text-center">
          <div>
            {entry.mediaStatus ===
            "PROCESSING" ? (
              <LoaderCircle className="mx-auto size-7 animate-spin text-amber" />
            ) : (
              <Clock3 className="mx-auto size-7 text-muted" />
            )}
            <p className="mt-3 text-xs font-bold text-muted">
              {entry.mediaStatus ===
              "PROCESSING"
                ? "Vídeo em processamento."
                : entry.mediaStatus ===
                    "FAILED"
                  ? "O processamento do vídeo falhou."
                  : "O vídeo ainda não está pronto para reprodução."}
            </p>
          </div>
        </div>
      );
    }

    if (!uploadedUrl) {
      return (
        <div className="mt-4 flex aspect-video items-center justify-center rounded-2xl border border-white/8 bg-black/25 p-5 text-center">
          <div>
            <button
              type="button"
              className="btn-primary"
              disabled={loadingMedia}
              onClick={() =>
                void loadUpload()
              }
            >
              {loadingMedia ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <ExternalLink className="size-4" />
              )}
              Visualizar vídeo aqui
            </button>

            <p className="mt-3 text-xs leading-relaxed text-muted">
              O vídeo privado será carregado nesta página
              usando um acesso temporário ao arquivo.
            </p>

            {mediaError ? (
              <p
                className="mt-3 text-xs text-coral"
                role="alert"
              >
                {mediaError}
              </p>
            ) : null}
          </div>
        </div>
      );
    }

    return (
      <div className="mt-4">
        <video
          key={uploadedUrl}
          controls
          playsInline
          preload="metadata"
          src={uploadedUrl}
          className="aspect-video w-full rounded-2xl bg-black object-contain"
        >
          Seu navegador não suporta reprodução de vídeo.
        </video>
        <p className="mt-2 text-[11px] text-muted">
          Vídeo enviado diretamente à plataforma.
        </p>
      </div>
    );
  }

  if (!externalSource) {
    return (
      <div className="mt-4 rounded-2xl border border-coral/20 bg-coral/5 p-4">
        <p className="text-xs font-bold text-coral">
          O link desta candidatura é inválido ou não está disponível.
        </p>
      </div>
    );
  }

  if (externalSource.kind === "VIDEO") {
    return (
      <div className="mt-4">
        <video
          controls
          playsInline
          preload="metadata"
          src={externalSource.src}
          className="aspect-video w-full rounded-2xl bg-black object-contain"
        >
          Seu navegador não suporta reprodução de vídeo.
        </video>
        <MediaSourceFooter
          provider={externalSource.provider}
          originalUrl={entry.externalUrl}
        />
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="aspect-video overflow-hidden rounded-2xl border border-white/8 bg-black">
        <iframe
          src={externalSource.src}
          title={`${entry.contestCategoryLabel} — ${externalSource.provider}`}
          loading="lazy"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox={
            externalSource.sandboxed
              ? "allow-scripts allow-forms allow-presentation allow-popups"
              : undefined
          }
          className="h-full w-full border-0"
        />
      </div>

      <MediaSourceFooter
        provider={externalSource.provider}
        originalUrl={entry.externalUrl}
        mayBlockEmbedding={
          externalSource.sandboxed
        }
      />
    </div>
  );
}

function MediaSourceFooter({
  provider,
  originalUrl,
  mayBlockEmbedding = false,
}: {
  provider: string;
  originalUrl?: string | null;
  mayBlockEmbedding?: boolean;
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted">
      <span>
        Fonte: {provider}
        {mayBlockEmbedding
          ? " • incorporação depende do provedor"
          : ""}
      </span>

      {originalUrl ? (
        <a
          href={originalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-bold text-cyan hover:text-white"
        >
          <ExternalLink className="size-3.5" />
          Abrir original
        </a>
      ) : null}
    </div>
  );
}

function normalizeExternalMedia(
  value?: string | null,
): ExternalMediaSource | null {
  if (!value) {
    return null;
  }

  try {
    const url =
      new URL(value);

    if (url.protocol !== "https:") {
      return null;
    }

    const hostname =
      url.hostname
        .toLowerCase()
        .replace(/^www\./, "");

    const youtubeId =
      youtubeVideoId(
        url,
        hostname,
      );

    if (youtubeId) {
      return {
        kind: "EMBED",
        src:
          `https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeId)}`,
        provider: "YouTube",
        sandboxed: false,
      };
    }

    if (
      hostname === "drive.google.com"
    ) {
      const driveId =
        googleDriveFileId(url);

      if (driveId) {
        return {
          kind: "EMBED",
          src:
            `https://drive.google.com/file/d/${encodeURIComponent(driveId)}/preview`,
          provider: "Google Drive",
          sandboxed: false,
        };
      }
    }

    if (
      hostname === "vimeo.com" ||
      hostname.endsWith(".vimeo.com")
    ) {
      const match =
        url.pathname.match(
          /(?:\/video)?\/(\d+)/,
        );

      if (match?.[1]) {
        return {
          kind: "EMBED",
          src:
            `https://player.vimeo.com/video/${encodeURIComponent(match[1])}`,
          provider: "Vimeo",
          sandboxed: false,
        };
      }
    }

    if (
      /\.(mp4|webm|ogg|m4v)$/i.test(
        url.pathname,
      )
    ) {
      return {
        kind: "VIDEO",
        src: url.toString(),
        provider: hostname,
        sandboxed: false,
      };
    }

    return {
      kind: "EMBED",
      src: url.toString(),
      provider: hostname,
      sandboxed: true,
    };
  } catch {
    return null;
  }
}

function youtubeVideoId(
  url: URL,
  hostname: string,
) {
  if (hostname === "youtu.be") {
    return (
      url.pathname
        .split("/")
        .filter(Boolean)[0] ??
      null
    );
  }

  if (
    hostname === "youtube.com" ||
    hostname === "m.youtube.com" ||
    hostname.endsWith(".youtube.com")
  ) {
    const queryId =
      url.searchParams.get("v");

    if (queryId) {
      return queryId;
    }

    const parts =
      url.pathname
        .split("/")
        .filter(Boolean);

    if (
      ["shorts", "embed", "live"].includes(
        parts[0] ?? "",
      )
    ) {
      return parts[1] ?? null;
    }
  }

  return null;
}

function googleDriveFileId(
  url: URL,
) {
  const match =
    url.pathname.match(
      /\/file\/d\/([^/]+)/,
    );

  if (match?.[1]) {
    return match[1];
  }

  return url.searchParams.get("id");
}

function ReviewBadge({
  status,
}: {
  status: AdminAwardRegistrationReviewStatus;
}) {
  if (status === "APPROVED") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-cyan/20 bg-cyan/5 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-cyan">
        <BadgeCheck className="size-3.5" />
        Aprovada
      </span>
    );
  }

  if (status === "REJECTED") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-coral/20 bg-coral/5 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-coral">
        <XCircle className="size-3.5" />
        Reprovada
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-amber/20 bg-amber/5 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber">
      <Clock3 className="size-3.5" />
      Aguardando análise
    </span>
  );
}

function CounterCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "cyan" | "amber" | "coral";
}) {
  const className =
    tone === "cyan"
      ? "border-cyan/15 bg-cyan/5 text-cyan"
      : tone === "amber"
        ? "border-amber/15 bg-amber/5 text-amber"
        : "border-coral/15 bg-coral/5 text-coral";

  return (
    <div
      className={`rounded-2xl border p-4 ${className}`}
    >
      <strong className="display-title text-3xl">
        {value}
      </strong>
      <p className="mt-1 text-xs font-black uppercase tracking-wider">
        {label}
      </p>
    </div>
  );
}

function formatDateTime(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      dateStyle: "short",
      timeStyle: "short",
      timeZone:
        "America/Sao_Paulo",
    },
  ).format(
    new Date(value),
  );
}
