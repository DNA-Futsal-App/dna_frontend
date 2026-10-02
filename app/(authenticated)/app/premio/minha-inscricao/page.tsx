"use client";

import Link from "next/link";
import {
    ChangeEvent,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    AlertTriangle,
    BadgeCheck,
    CheckCircle2,
    ExternalLink,
    FileVideo2,
    Link2,
    LoaderCircle,
    Plus,
    RefreshCw,
    Save,
    Trash2,
    Trophy,
    UploadCloud,
    UserRound,
    X,
} from "lucide-react";

import {
    ClientApiError,
    clientApi,
} from "@/lib/client-api";

import type {
    AwardContestCategory,
    AwardMediaTicketResponse,
    AwardRegistrationContext,
    AwardRegistrationEntryResponse,
    AwardRegistrationResponse,
    AwardUploadTicketResponse,
    MediaSourceType,
} from "@/lib/award-registration-types";

import {
    publishAwardNotice,
    watchAwardProcessing,
} from "@/lib/award-processing";

type VideoInfo = {
    durationSeconds: number;
    width: number;
    height: number;
    willResize: boolean;
};

type AddCandidateState = {
    contestCategory: AwardContestCategory | "";
    sourceType: MediaSourceType;
    externalUrl: string;
    file: File | null;
    fileInfo: VideoInfo | null;
    fileError: string;
};

const initialAddState: AddCandidateState = {
    contestCategory: "",
    sourceType: "UPLOAD",
    externalUrl: "",
    file: null,
    fileInfo: null,
    fileError: "",
};

export default function MyAwardRegistrationPage() {
    const [registration, setRegistration] =
        useState<AwardRegistrationResponse | null>(null);

    const [context, setContext] =
        useState<AwardRegistrationContext | null>(null);

    const [mediaUrls, setMediaUrls] =
        useState<Record<string, string>>({});

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    const [notFound, setNotFound] =
        useState(false);

    const [adding, setAdding] =
        useState(false);

    const [addForm, setAddForm] =
        useState<AddCandidateState>(
            initialAddState,
        );

    const [
        savingNewCandidate,
        setSavingNewCandidate,
    ] = useState(false);

    const [
        processingEntry,
        setProcessingEntry,
    ] = useState<string | null>(null);

    const [
        editingLink,
        setEditingLink,
    ] = useState<string | null>(null);

    const [linkDraft, setLinkDraft] =
        useState("");

    const fileInputs =
        useRef<Record<string, HTMLInputElement | null>>(
            {},
        );
    const mediaStateSignatureRef =
        useRef("");

    const loadMedia = useCallback(
        async (
            current: AwardRegistrationResponse,
        ) => {
            if (
                current.status === "CANCELLED"
            ) {
                setMediaUrls({});
                return;
            }
            const uploads =
                current.entries.filter(
                    (entry) =>
                        entry.sourceType === "UPLOAD" &&
                        entry.mediaStatus !== "PENDING",
                );

            const results =
                await Promise.all(
                    uploads.map(
                        async (entry) => {
                            try {
                                const ticket =
                                    await clientApi<AwardMediaTicketResponse>(
                                        `/api/awards/registrations/${current.id}/entries/${entry.id}/media-ticket`,
                                        {
                                            method: "POST",
                                        },
                                    );

                                return [
                                    entry.id,
                                    ticket.url,
                                ] as const;
                            } catch {
                                return null;
                            }
                        },
                    ),
                );
            setMediaUrls(
                (previous) => {
                    const activeIds =
                        new Set(
                            current.entries.map(
                                (entry) => entry.id,
                            ),
                        );

                    const next: Record<
                        string,
                        string
                    > = {};

                    for (
                        const [
                            entryId,
                            url,
                        ] of Object.entries(
                            previous,
                        )
                    ) {
                        if (
                            activeIds.has(
                                entryId,
                            )
                        ) {
                            next[entryId] =
                                url;
                        }
                    }

                    for (
                        const result
                        of results
                    ) {
                        if (result) {
                            next[
                                result[0]
                            ] = result[1];
                        }
                    }

                    return next;
                },
            );
        },
        [],
    );

    const applyRegistration =
        useCallback(
            async (
                current:
                    AwardRegistrationResponse,
                forceMediaRefresh = false,
            ) => {
                setRegistration(
                    current,
                );

                const signature =
                    registrationMediaSignature(
                        current,
                    );

                if (
                    forceMediaRefresh ||
                    signature !==
                    mediaStateSignatureRef.current
                ) {
                    mediaStateSignatureRef.current =
                        signature;

                    await loadMedia(
                        current,
                    );
                }
            },
            [loadMedia],
        );

    const reloadRegistration =
        useCallback(
            async () => {
                const current =
                    await clientApi<AwardRegistrationResponse>(
                        "/api/awards/registrations/current",
                    );

                await applyRegistration(
                    current,
                );

                return current;
            },
            [applyRegistration],
        );

    const load =
        useCallback(
            async () => {
                setLoading(true);
                setError("");

                try {
                    const [
                        rules,
                        current,
                    ] =
                        await Promise.all([
                            clientApi<AwardRegistrationContext>(
                                "/api/awards/registrations/context",
                            ),

                            clientApi<AwardRegistrationResponse>(
                                "/api/awards/registrations/current",
                            ),
                        ]);

                    setContext(
                        rules,
                    );

                    setNotFound(
                        false,
                    );

                    await applyRegistration(
                        current,
                        true,
                    );
                } catch (err) {
                    if (
                        err instanceof
                        ClientApiError &&
                        err.status === 404
                    ) {
                        setNotFound(
                            true,
                        );

                        return;
                    }

                    setError(
                        err instanceof Error
                            ? err.message
                            : "Não foi possível carregar a inscrição.",
                    );
                } finally {
                    setLoading(
                        false,
                    );
                }
            },
            [applyRegistration],
        );

    useEffect(() => {
        void load();
    }, [load]);
    const hasProcessing =
        registration?.entries.some(
            (entry) =>
                entry.mediaStatus ===
                "PROCESSING",
        ) ?? false;

    useEffect(() => {
        if (!hasProcessing) {
            return;
        }

        let active =
            true;

        const poll =
            async () => {
                try {
                    if (!active) {
                        return;
                    }

                    await reloadRegistration();
                } catch {
                }
            };

        const interval =
            window.setInterval(
                () => {
                    void poll();
                },
                3500,
            );

        return () => {
            active =
                false;

            window.clearInterval(
                interval,
            );
        };
    }, [
        hasProcessing,
        reloadRegistration,
    ]);

    const usedCategories =
        useMemo(
            () =>
                new Set(
                    registration?.entries.map(
                        (entry) =>
                            entry.contestCategory,
                    ) ?? [],
                ),
            [registration],
        );

    const availableCategories =
        useMemo(
            () =>
                context?.contestCategories.filter(
                    (category) =>
                        !usedCategories.has(
                            category.code,
                        ),
                ) ?? [],
            [
                context,
                usedCategories,
            ],
        );

    function processingIdsIncluding(
        entryId: string,
    ) {
        const ids =
            registration?.entries
                .filter(
                    (entry) =>
                        entry.mediaStatus ===
                        "PROCESSING",
                )
                .map(
                    (entry) =>
                        entry.id,
                ) ?? [];

        return Array.from(
            new Set([
                ...ids,
                entryId,
            ]),
        );
    }

    async function selectNewVideo(
        file: File | null,
    ) {
        if (
            !file ||
            !context
        ) {
            setAddForm(
                (current) => ({
                    ...current,
                    file: null,
                    fileInfo: null,
                    fileError: "",
                }),
            );

            return;
        }

        try {
            const info =
                await inspectVideo(
                    file,
                    context,
                );

            setAddForm(
                (current) => ({
                    ...current,
                    file,
                    fileInfo: info,
                    fileError: "",
                }),
            );
        } catch (err) {
            setAddForm(
                (current) => ({
                    ...current,
                    file: null,
                    fileInfo: null,

                    fileError:
                        err instanceof Error
                            ? err.message
                            : "Vídeo inválido.",
                }),
            );
        }
    }

    /*
     * ADICIONAR NOVA CANDIDATURA
     *
     * UPLOAD:
     * cria entry
     * -> envia Oracle
     * -> complete-upload retorna 202
     * -> FECHA MODAL
     * -> backend continua sozinho
     *
     * LINK:
     * cria entry READY
     * -> tenta submit imediatamente
     * -> fecha modal
     */
    async function addCandidate() {
        if (
            !registration ||
            !context ||
            savingNewCandidate
        ) {
            return;
        }

        setError("");

        if (
            !addForm.contestCategory
        ) {
            setError(
                "Selecione a categoria da candidatura.",
            );

            return;
        }

        if (
            addForm.sourceType ===
            "UPLOAD" &&
            (
                !addForm.file ||
                !addForm.fileInfo ||
                addForm.fileError
            )
        ) {
            setError(
                "Selecione um vídeo válido.",
            );

            return;
        }

        if (
            addForm.sourceType ===
            "LINK" &&
            !isValidHttpsUrl(
                addForm.externalUrl,
            )
        ) {
            setError(
                "Informe um link HTTPS válido.",
            );

            return;
        }

        setSavingNewCandidate(
            true,
        );

        try {
            const created =
                await clientApi<AwardRegistrationEntryResponse>(
                    `/api/awards/registrations/${registration.id}/entries`,
                    {
                        method:
                            "POST",

                        body:
                            JSON.stringify({
                                contestCategory:
                                    addForm.contestCategory,

                                sourceType:
                                    addForm.sourceType,

                                externalUrl:
                                    addForm.sourceType ===
                                        "LINK"
                                        ? addForm.externalUrl.trim()
                                        : null,
                            }),
                    },
                );
            if (
                addForm.sourceType ===
                "UPLOAD" &&
                addForm.file
            ) {
                await uploadVideo(
                    registration.id,
                    created.id,
                    addForm.file,
                );
                watchAwardProcessing({
                    registrationId:
                        registration.id,

                    registrationNumber:
                        registration.registrationNumber,

                    entryIds:
                        processingIdsIncluding(
                            created.id,
                        ),
                });

                publishAwardNotice({
                    type:
                        "info",

                    message:
                        "Recebemos seu vídeo. "
                        + "Você pode continuar usando o app enquanto concluímos o processamento.",
                });
                setAdding(
                    false,
                );

                setAddForm(
                    initialAddState,
                );
                await reloadRegistration();

                return;
            }
            const current =
                await clientApi<AwardRegistrationResponse>(
                    "/api/awards/registrations/current",
                );

            const allReady =
                current.entries.length >
                0 &&
                current.entries.every(
                    (entry) =>
                        entry.mediaStatus ===
                        "READY",
                );

            if (
                allReady &&
                current.status !==
                "SUBMITTED"
            ) {
                await clientApi<AwardRegistrationResponse>(
                    `/api/awards/registrations/${registration.id}/submit`,
                    {
                        method:
                            "POST",
                    },
                );
            }

            setAdding(
                false,
            );

            setAddForm(
                initialAddState,
            );

            publishAwardNotice({
                type:
                    "success",

                message:
                    "Candidatura adicionada com sucesso.",
            });

            await reloadRegistration();

        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Não foi possível adicionar a candidatura.",
            );


            try {
                await reloadRegistration();
            } catch {

            }

        } finally {
            setSavingNewCandidate(
                false,
            );
        }
    }
    async function replaceVideo(
        entry:
            AwardRegistrationEntryResponse,
        event:
            ChangeEvent<HTMLInputElement>,
    ) {
        const file =
            event.target.files?.[0];

        event.target.value =
            "";

        if (
            !file ||
            !registration ||
            !context
        ) {
            return;
        }

        setError("");

        try {
            await inspectVideo(
                file,
                context,
            );

            setProcessingEntry(
                entry.id,
            );

            await uploadVideo(
                registration.id,
                entry.id,
                file,
            );

            watchAwardProcessing({
                registrationId:
                    registration.id,

                registrationNumber:
                    registration.registrationNumber,

                entryIds:
                    processingIdsIncluding(
                        entry.id,
                    ),
            });

            publishAwardNotice({
                type:
                    "info",

                message:
                    "Recebemos o novo vídeo. "
                    + "Você pode continuar usando o app enquanto concluímos o processamento.",
            });
            await reloadRegistration();

        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Não foi possível substituir o vídeo.",
            );

        } finally {
            setProcessingEntry(
                null,
            );
        }
    }
    async function uploadVideo(
        registrationId: string,
        entryId: string,
        file: File,
    ) {
        const ticket =
            await clientApi<AwardUploadTicketResponse>(
                `/api/awards/registrations/${registrationId}/entries/${entryId}/upload-ticket`,
                {
                    method:
                        "POST",

                    body:
                        JSON.stringify({
                            sizeBytes:
                                file.size,

                            contentType:
                                file.type ||
                                "application/octet-stream",
                        }),
                },
            );

        await uploadToOracle(
            ticket.uploadUrl,
            file,
        );

        return clientApi<AwardRegistrationEntryResponse>(
            `/api/awards/registrations/${registrationId}/entries/${entryId}/complete-upload`,
            {
                method:
                    "POST",
            },
        );
    }

    function beginEditLink(
        entry:
            AwardRegistrationEntryResponse,
    ) {
        setEditingLink(
            entry.id,
        );

        setLinkDraft(
            entry.externalUrl ??
            "",
        );
    }

    async function saveLink(
        entry:
            AwardRegistrationEntryResponse,
    ) {
        if (
            !registration ||
            !isValidHttpsUrl(
                linkDraft,
            )
        ) {
            setError(
                "Informe um link HTTPS válido.",
            );

            return;
        }

        setProcessingEntry(
            entry.id,
        );

        setError("");

        try {
            await clientApi(
                `/api/awards/registrations/${registration.id}/entries/${entry.id}/link`,
                {
                    method:
                        "PUT",

                    body:
                        JSON.stringify({
                            url:
                                linkDraft.trim(),
                        }),
                },
            );

            setEditingLink(
                null,
            );

            publishAwardNotice({
                type:
                    "success",

                message:
                    "Link do vídeo atualizado com sucesso.",
            });

            await reloadRegistration();

        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Não foi possível alterar o link.",
            );

        } finally {
            setProcessingEntry(
                null,
            );
        }
    }

    async function withdrawEntry(
        entry:
            AwardRegistrationEntryResponse,
    ) {
        if (!registration) {
            return;
        }

        const confirmed =
            window.confirm(
                `Retirar a candidatura "${entry.contestCategoryLabel}"? O vídeo armazenado será excluído.`,
            );

        if (!confirmed) {
            return;
        }

        setProcessingEntry(
            entry.id,
        );

        setError("");

        try {
            await clientApi(
                `/api/awards/registrations/${registration.id}/entries/${entry.id}`,
                {
                    method:
                        "DELETE",
                },
            );

            publishAwardNotice({
                type:
                    "success",

                message:
                    "Candidatura retirada.",
            });

            await reloadRegistration();

        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Não foi possível retirar a candidatura.",
            );

        } finally {
            setProcessingEntry(
                null,
            );
        }
    }

    async function withdrawAll() {
        if (!registration) {
            return;
        }

        const confirmed =
            window.confirm(
                "Retirar todas as candidaturas? Os vídeos armazenados serão excluídos.",
            );

        if (!confirmed) {
            return;
        }

        setError("");

        try {
            await clientApi(
                `/api/awards/registrations/${registration.id}`,
                {
                    method:
                        "DELETE",
                },
            );

            publishAwardNotice({
                type:
                    "success",

                message:
                    "Todas as candidaturas foram retiradas.",
            });

            await reloadRegistration();

        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Não foi possível retirar as candidaturas.",
            );
        }
    }

    if (loading) {
        return (
            <div className="flex min-h-80 items-center justify-center">
                <LoaderCircle className="size-9 animate-spin text-cyan" />
            </div>
        );
    }

    if (notFound) {
        return (
            <section className="surface mx-auto max-w-2xl rounded-[1.75rem] p-6 sm:p-8">
                <Trophy className="size-10 text-amber" />

                <h1 className="display-title mt-5 text-4xl font-black">
                    Você ainda não possui uma inscrição.
                </h1>

                <p className="mt-3 text-sm leading-relaxed text-muted">
                    Faça a primeira inscrição do atleta para começar.
                </p>

                <Link
                    href="/app/premio/inscricao"
                    className="btn-primary mt-6"
                >
                    Fazer inscrição
                </Link>
            </section>
        );
    }

    if (
        !registration ||
        !context
    ) {
        return null;
    }

    const cancelled =
        registration.status ===
        "CANCELLED";

    return (
        <div className="mx-auto max-w-5xl">
            <header className="mb-7">
                <p className="eyebrow">
                    Prêmio Legacy
                </p>

                <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="display-title text-4xl font-black sm:text-5xl">
                            Minha inscrição
                        </h1>

                        <p className="mt-2 text-sm text-muted">
                            #
                            {String(
                                registration.registrationNumber,
                            ).padStart(
                                6,
                                "0",
                            )}
                        </p>
                    </div>

                    {registration.entries.length <
                        4 &&
                        availableCategories.length >
                        0 ? (
                        <button
                            type="button"
                            onClick={() => {
                                setError("");

                                setAddForm(
                                    initialAddState,
                                );

                                setAdding(
                                    true,
                                );
                            }}
                            className="btn-primary"
                        >
                            <Plus className="size-5" />

                            {cancelled
                                ? "Reinscrever atleta"
                                : "Adicionar candidatura"}
                        </button>
                    ) : null}
                </div>
            </header>

            {error ? (
                <div
                    className="mb-5 rounded-xl border border-coral/25 bg-coral/8 px-4 py-3 text-sm text-[#ffb195]"
                    role="alert"
                >
                    {error}
                </div>
            ) : null}

            {cancelled ? (
                <div className="mb-5 rounded-2xl border border-coral/20 bg-coral/5 p-5">
                    <strong className="text-coral">
                        Inscrição sem candidaturas ativas
                    </strong>

                    <p className="mt-1 text-sm leading-relaxed text-muted">
                        Todas as candidaturas deste atleta foram retiradas.
                        Você pode reinscrevê-lo enquanto o período de inscrições estiver aberto.
                    </p>
                </div>
            ) : null}

            {hasProcessing ? (
                <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber/20 bg-amber/5 p-4">
                    <LoaderCircle className="mt-0.5 size-5 shrink-0 animate-spin text-amber" />

                    <div>
                        <strong className="text-sm text-amber">
                            Processando vídeo
                        </strong>

                        <p className="mt-1 text-xs leading-relaxed text-muted">
                            Você não precisa permanecer nesta página.
                            O processamento continuará no servidor e avisaremos quando terminar.
                        </p>
                    </div>
                </div>
            ) : null}

            <section className="surface rounded-[1.75rem] p-5 sm:p-7">
                <div className="flex items-center gap-3">
                    <UserRound className="size-5 text-cyan" />

                    <h2 className="text-lg font-black">
                        Dados do atleta
                    </h2>
                </div>

                <p className="mt-2 text-xs text-muted">
                    Estes dados não podem ser alterados pela gestão das candidaturas.
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <ReadOnlyField
                        label="Atleta"
                        value={
                            registration.athleteName
                        }
                    />

                    <ReadOnlyField
                        label="Instagram"
                        value={
                            registration.athleteInstagram.startsWith(
                                "@",
                            )
                                ? registration.athleteInstagram
                                : `@${registration.athleteInstagram}`
                        }
                    />

                    <ReadOnlyField
                        label="CPF"
                        value="Cadastrado e protegido"
                    />

                    <ReadOnlyField
                        label="Divisão"
                        value={
                            registration.divisionName
                        }
                    />

                    <ReadOnlyField
                        label="Categoria"
                        value={
                            registration.categoryName
                        }
                    />

                    <ReadOnlyField
                        label="Time"
                        value={
                            registration.teamName
                        }
                    />

                    <ReadOnlyField
                        label="Gênero"
                        value={
                            registration.gender ===
                                "FEMALE"
                                ? "Feminino"
                                : "Masculino"
                        }
                    />
                </div>
            </section>

            <section className="mt-6">
                <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="eyebrow">
                            Candidaturas
                        </p>

                        <h2 className="display-title mt-2 text-3xl font-black">
                            Categorias concorrendo
                        </h2>
                    </div>

                    {!cancelled &&
                        registration.entries.length >
                        0 ? (
                        <button
                            type="button"
                            onClick={() =>
                                void withdrawAll()
                            }
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-coral/25 bg-coral/5 px-4 text-sm font-black text-coral"
                        >
                            <Trash2 className="size-4" />
                            Retirar todas
                        </button>
                    ) : null}
                </div>

                {registration.entries.length ===
                    0 ? (
                    <div className="surface rounded-[1.75rem] p-7 text-center">
                        <Trophy className="mx-auto size-9 text-muted" />

                        <p className="mt-3 text-sm text-muted">
                            Nenhuma candidatura ativa.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-5 lg:grid-cols-2">
                        {registration.entries.map(
                            (entry) => {
                                const localProcessing =
                                    processingEntry ===
                                    entry.id;

                                const backendProcessing =
                                    entry.mediaStatus ===
                                    "PROCESSING";

                                const failed =
                                    entry.mediaStatus ===
                                    "FAILED";

                                return (
                                    <article
                                        key={entry.id}
                                        className="surface overflow-hidden rounded-[1.75rem]"
                                    >
                                        <div className="border-b border-white/7 p-5">
                                            <EntryStatus
                                                entry={
                                                    entry
                                                }
                                            />

                                            <h3 className="mt-3 text-xl font-black">
                                                {
                                                    entry.contestCategoryLabel
                                                }
                                            </h3>
                                        </div>

                                        <div className="p-5">
                                            {entry.sourceType ===
                                                "UPLOAD" ? (
                                                <>
                                                    {mediaUrls[
                                                        entry.id
                                                    ] ? (
                                                        <video
                                                            key={
                                                                mediaUrls[
                                                                entry.id
                                                                ]
                                                            }
                                                            controls
                                                            playsInline
                                                            preload="metadata"
                                                            src={
                                                                mediaUrls[
                                                                entry.id
                                                                ]
                                                            }
                                                            className="aspect-video w-full rounded-2xl bg-black object-contain"
                                                        >
                                                            Seu navegador não suporta reprodução de vídeo.
                                                        </video>
                                                    ) : (
                                                        <VideoPlaceholder
                                                            status={
                                                                entry.mediaStatus
                                                            }
                                                        />
                                                    )}

                                                    <input
                                                        ref={(
                                                            element,
                                                        ) => {
                                                            fileInputs.current[
                                                                entry.id
                                                            ] =
                                                                element;
                                                        }}
                                                        type="file"
                                                        accept="video/*"
                                                        className="hidden"
                                                        disabled={
                                                            localProcessing ||
                                                            backendProcessing
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) =>
                                                            void replaceVideo(
                                                                entry,
                                                                event,
                                                            )
                                                        }
                                                    />

                                                    {!cancelled ? (
                                                        <button
                                                            type="button"
                                                            disabled={
                                                                localProcessing ||
                                                                backendProcessing
                                                            }
                                                            onClick={() =>
                                                                fileInputs.current[
                                                                    entry.id
                                                                ]?.click()
                                                            }
                                                            className="btn-ghost mt-4 w-full"
                                                        >
                                                            {localProcessing ||
                                                                backendProcessing ? (
                                                                <LoaderCircle className="size-4 animate-spin" />
                                                            ) : (
                                                                <RefreshCw className="size-4" />
                                                            )}

                                                            {backendProcessing
                                                                ? "Processando vídeo..."
                                                                : failed
                                                                    ? "Tentar novamente"
                                                                    : entry.mediaStatus ===
                                                                        "READY"
                                                                        ? "Substituir vídeo"
                                                                        : "Enviar vídeo"}
                                                        </button>
                                                    ) : null}
                                                </>
                                            ) : (
                                                <>
                                                    {editingLink ===
                                                        entry.id ? (
                                                        <div className="grid gap-3">
                                                            <input
                                                                className="field"
                                                                type="url"
                                                                value={
                                                                    linkDraft
                                                                }
                                                                onChange={(
                                                                    event,
                                                                ) =>
                                                                    setLinkDraft(
                                                                        event.target
                                                                            .value,
                                                                    )
                                                                }
                                                                placeholder="https://..."
                                                            />

                                                            <div className="grid grid-cols-2 gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setEditingLink(
                                                                            null,
                                                                        )
                                                                    }
                                                                    className="btn-ghost"
                                                                >
                                                                    Cancelar
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    disabled={
                                                                        localProcessing
                                                                    }
                                                                    onClick={() =>
                                                                        void saveLink(
                                                                            entry,
                                                                        )
                                                                    }
                                                                    className="btn-primary"
                                                                >
                                                                    {localProcessing ? (
                                                                        <LoaderCircle className="size-4 animate-spin" />
                                                                    ) : (
                                                                        <Save className="size-4" />
                                                                    )}

                                                                    Salvar
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            {entry.externalUrl ? (
                                                                <a
                                                                    href={
                                                                        entry.externalUrl
                                                                    }
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="btn-ghost w-full"
                                                                >
                                                                    <ExternalLink className="size-4" />
                                                                    Abrir vídeo
                                                                </a>
                                                            ) : null}

                                                            {!cancelled ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        beginEditLink(
                                                                            entry,
                                                                        )
                                                                    }
                                                                    className="btn-ghost mt-3 w-full"
                                                                >
                                                                    <RefreshCw className="size-4" />
                                                                    Alterar link
                                                                </button>
                                                            ) : null}
                                                        </>
                                                    )}
                                                </>
                                            )}

                                            {!cancelled ? (
                                                <button
                                                    type="button"
                                                    disabled={
                                                        localProcessing
                                                    }
                                                    onClick={() =>
                                                        void withdrawEntry(
                                                            entry,
                                                        )
                                                    }
                                                    className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-coral/25 bg-coral/5 px-4 text-sm font-black text-coral disabled:opacity-50"
                                                >
                                                    <Trash2 className="size-4" />
                                                    Retirar candidatura
                                                </button>
                                            ) : null}
                                        </div>
                                    </article>
                                );
                            },
                        )}
                    </div>
                )}
            </section>

            {adding ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Adicionar candidatura"
                >
                    <div className="surface relative max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-[1.75rem] p-6 sm:p-7">
                        <button
                            type="button"
                            disabled={
                                savingNewCandidate
                            }
                            onClick={() =>
                                setAdding(
                                    false,
                                )
                            }
                            className="absolute right-4 top-4 inline-flex size-9 items-center justify-center rounded-full border border-white/8 text-muted hover:text-ivory disabled:opacity-50"
                            aria-label="Fechar"
                        >
                            <X className="size-4" />
                        </button>

                        <Trophy className="size-10 text-amber" />

                        <h2 className="display-title mt-4 text-3xl font-black">
                            {cancelled
                                ? "Reinscrever atleta"
                                : "Adicionar candidatura"}
                        </h2>

                        <p className="mt-2 text-sm leading-relaxed text-muted">
                            Escolha uma categoria ainda não utilizada e envie o vídeo.
                        </p>

                        <label className="mt-6 grid gap-1.5 text-sm font-bold">
                            Categoria do prêmio

                            <select
                                className="field"
                                value={
                                    addForm.contestCategory
                                }
                                disabled={
                                    savingNewCandidate
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setAddForm(
                                        (current) => ({
                                            ...current,

                                            contestCategory:
                                                event.target
                                                    .value as AwardContestCategory,
                                        }),
                                    )
                                }
                            >
                                <option value="">
                                    Selecione
                                </option>

                                {availableCategories.map(
                                    (category) => (
                                        <option
                                            key={
                                                category.code
                                            }
                                            value={
                                                category.code
                                            }
                                        >
                                            {
                                                category.label
                                            }
                                        </option>
                                    ),
                                )}
                            </select>
                        </label>

                        <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-black/15 p-1.5">
                            <button
                                type="button"
                                disabled={
                                    savingNewCandidate
                                }
                                onClick={() =>
                                    setAddForm(
                                        (current) => ({
                                            ...current,

                                            sourceType:
                                                "UPLOAD",

                                            externalUrl:
                                                "",
                                        }),
                                    )
                                }
                                className={
                                    addForm.sourceType ===
                                        "UPLOAD"
                                        ? "flex min-h-11 items-center justify-center gap-2 rounded-lg bg-cyan text-sm font-black text-ink"
                                        : "flex min-h-11 items-center justify-center gap-2 rounded-lg text-sm font-black text-muted"
                                }
                            >
                                <UploadCloud className="size-4" />
                                Upload
                            </button>

                            <button
                                type="button"
                                disabled={
                                    savingNewCandidate
                                }
                                onClick={() =>
                                    setAddForm(
                                        (current) => ({
                                            ...current,

                                            sourceType:
                                                "LINK",

                                            file:
                                                null,

                                            fileInfo:
                                                null,

                                            fileError:
                                                "",
                                        }),
                                    )
                                }
                                className={
                                    addForm.sourceType ===
                                        "LINK"
                                        ? "flex min-h-11 items-center justify-center gap-2 rounded-lg bg-amber text-sm font-black text-ink"
                                        : "flex min-h-11 items-center justify-center gap-2 rounded-lg text-sm font-black text-muted"
                                }
                            >
                                <Link2 className="size-4" />
                                Link
                            </button>
                        </div>

                        {addForm.sourceType ===
                            "UPLOAD" ? (
                            <div className="mt-4">
                                <label
                                    className={`flex min-h-32 flex-col items-center justify-center rounded-2xl border border-dashed border-cyan/25 bg-cyan/4 px-4 py-5 text-center ${savingNewCandidate
                                        ? "cursor-not-allowed opacity-60"
                                        : "cursor-pointer hover:border-cyan/50"
                                        }`}
                                >
                                    {savingNewCandidate ? (
                                        <LoaderCircle className="size-7 animate-spin text-cyan" />
                                    ) : (
                                        <FileVideo2 className="size-7 text-cyan" />
                                    )}

                                    <strong className="mt-2 text-sm">
                                        {addForm.file
                                            ? addForm.file.name
                                            : "Selecionar vídeo"}
                                    </strong>

                                    <span className="mt-1 text-xs text-muted">
                                        Até{" "}
                                        {
                                            context.maxDurationSeconds
                                        }
                                        s • máximo{" "}
                                        {formatBytes(
                                            context.maxUploadBytes,
                                        )}
                                    </span>

                                    <input
                                        type="file"
                                        accept="video/*"
                                        className="hidden"
                                        disabled={
                                            savingNewCandidate
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            void selectNewVideo(
                                                event.target
                                                    .files?.[0] ??
                                                null,
                                            )
                                        }
                                    />
                                </label>

                                {addForm.fileInfo ? (
                                    <div className="mt-3 rounded-xl border border-cyan/15 bg-cyan/5 p-3 text-xs text-muted">
                                        <strong className="text-cyan">
                                            Vídeo validado
                                        </strong>

                                        {" • "}

                                        {addForm.fileInfo.durationSeconds.toFixed(
                                            1,
                                        )}
                                        s

                                        {" • "}

                                        {
                                            addForm.fileInfo
                                                .width
                                        }
                                        ×
                                        {
                                            addForm.fileInfo
                                                .height
                                        }

                                        {addForm.fileInfo.willResize ? (
                                            <p className="mt-1 text-amber">
                                                Será reduzido automaticamente para no máximo 720p.
                                            </p>
                                        ) : null}
                                    </div>
                                ) : null}

                                {addForm.fileError ? (
                                    <p className="mt-3 rounded-xl border border-coral/25 bg-coral/8 p-3 text-sm text-coral">
                                        {
                                            addForm.fileError
                                        }
                                    </p>
                                ) : null}
                            </div>
                        ) : (
                            <label className="mt-4 grid gap-1.5 text-sm font-bold">
                                Link do vídeo

                                <input
                                    className="field"
                                    type="url"
                                    disabled={
                                        savingNewCandidate
                                    }
                                    value={
                                        addForm.externalUrl
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setAddForm(
                                            (current) => ({
                                                ...current,

                                                externalUrl:
                                                    event.target
                                                        .value,
                                            }),
                                        )
                                    }
                                    placeholder="https://..."
                                />
                            </label>
                        )}

                        <button
                            type="button"
                            disabled={
                                savingNewCandidate
                            }
                            onClick={() =>
                                void addCandidate()
                            }
                            className="btn-primary mt-6 w-full"
                        >
                            {savingNewCandidate ? (
                                <LoaderCircle className="size-5 animate-spin" />
                            ) : (
                                <Plus className="size-5" />
                            )}

                            {savingNewCandidate
                                ? addForm.sourceType ===
                                    "UPLOAD"
                                    ? "Enviando vídeo..."
                                    : "Adicionando..."
                                : cancelled
                                    ? "Reinscrever"
                                    : "Adicionar candidatura"}
                        </button>

                        {savingNewCandidate &&
                            addForm.sourceType ===
                            "UPLOAD" ? (
                            <p className="mt-3 text-center text-xs leading-relaxed text-muted">
                                Aguarde apenas o envio do arquivo. Assim que o servidor recebê-lo,
                                esta janela será fechada e o processamento continuará em segundo plano.
                            </p>
                        ) : null}
                    </div>
                </div>
            ) : null}
        </div>
    );
}

function EntryStatus({
    entry,
}: {
    entry:
    AwardRegistrationEntryResponse;
}) {
    if (
        entry.mediaStatus ===
        "PROCESSING"
    ) {
        return (
            <span className="inline-flex items-center gap-2 rounded-full border border-amber/20 bg-amber/5 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber">
                <LoaderCircle className="size-3.5 animate-spin" />
                Processando vídeo
            </span>
        );
    }

    if (
        entry.mediaStatus ===
        "FAILED"
    ) {
        return (
            <span className="inline-flex items-center gap-2 rounded-full border border-coral/20 bg-coral/5 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-coral">
                <AlertTriangle className="size-3.5" />
                Falha no vídeo
            </span>
        );
    }

    if (
        entry.mediaStatus ===
        "READY"
    ) {
        return (
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan/15 bg-cyan/5 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-cyan">
                <BadgeCheck className="size-3.5" />
                Candidatura ativa
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-muted">
            <FileVideo2 className="size-3.5" />
            Aguardando vídeo
        </span>
    );
}

function VideoPlaceholder({
    status,
}: {
    status:
    AwardRegistrationEntryResponse["mediaStatus"];
}) {
    return (
        <div className="flex aspect-video items-center justify-center rounded-2xl border border-white/8 bg-black/20 px-5">
            <div className="text-center">
                {status ===
                    "PROCESSING" ? (
                    <LoaderCircle className="mx-auto size-9 animate-spin text-amber" />
                ) : status ===
                    "FAILED" ? (
                    <AlertTriangle className="mx-auto size-9 text-coral" />
                ) : status ===
                    "READY" ? (
                    <CheckCircle2 className="mx-auto size-9 text-cyan" />
                ) : (
                    <FileVideo2 className="mx-auto size-9 text-muted" />
                )}

                <p className="mt-3 text-sm font-bold text-ivory">
                    {status ===
                        "PROCESSING"
                        ? "Seu vídeo está sendo processado"
                        : status ===
                            "FAILED"
                            ? "Não foi possível processar o vídeo"
                            : status ===
                                "READY"
                                ? "Carregando vídeo..."
                                : "Aguardando vídeo"}
                </p>

                {status ===
                    "PROCESSING" ? (
                    <p className="mt-1 text-xs text-muted">
                        Você pode continuar usando o aplicativo.
                    </p>
                ) : null}
            </div>
        </div>
    );
}

function ReadOnlyField({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-xl border border-white/7 bg-night/25 px-4 py-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted">
                {label}
            </span>

            <strong className="mt-1 block text-sm text-ivory">
                {value}
            </strong>
        </div>
    );
}

async function inspectVideo(
    file: File,
    context:
        AwardRegistrationContext,
): Promise<VideoInfo> {
    if (
        !file.type.startsWith(
            "video/",
        )
    ) {
        throw new Error(
            "O arquivo selecionado não é um vídeo.",
        );
    }

    if (
        file.size >
        context.maxUploadBytes
    ) {
        throw new Error(
            `O vídeo excede o limite de ${formatBytes(
                context.maxUploadBytes,
            )}.`,
        );
    }

    const url =
        URL.createObjectURL(
            file,
        );

    try {
        const metadata =
            await new Promise<{
                duration: number;
                width: number;
                height: number;
            }>(
                (
                    resolve,
                    reject,
                ) => {
                    const video =
                        document.createElement(
                            "video",
                        );

                    video.preload =
                        "metadata";

                    video.onloadedmetadata =
                        () =>
                            resolve({
                                duration:
                                    video.duration,

                                width:
                                    video.videoWidth,

                                height:
                                    video.videoHeight,
                            });

                    video.onerror =
                        () =>
                            reject(
                                new Error(
                                    "O navegador não reconheceu este arquivo como um vídeo válido.",
                                ),
                            );

                    video.src =
                        url;
                },
            );

        if (
            !Number.isFinite(
                metadata.duration,
            ) ||
            metadata.duration <= 0
        ) {
            throw new Error(
                "Não foi possível identificar a duração do vídeo.",
            );
        }

        if (
            metadata.duration >
            context.maxDurationSeconds +
            0.05
        ) {
            throw new Error(
                `O vídeo deve ter no máximo ${context.maxDurationSeconds} segundos.`,
            );
        }

        if (
            !metadata.width ||
            !metadata.height
        ) {
            throw new Error(
                "Não foi possível identificar a resolução do vídeo.",
            );
        }

        const landscape =
            metadata.width >=
            metadata.height;

        return {
            durationSeconds:
                metadata.duration,

            width:
                metadata.width,

            height:
                metadata.height,

            willResize:
                landscape
                    ? metadata.width >
                    1280 ||
                    metadata.height >
                    720
                    : metadata.width >
                    720 ||
                    metadata.height >
                    1280,
        };
    } finally {
        URL.revokeObjectURL(
            url,
        );
    }
}

function uploadToOracle(
    uploadUrl: string,
    file: File,
) {
    return new Promise<void>(
        (
            resolve,
            reject,
        ) => {
            const request =
                new XMLHttpRequest();

            request.open(
                "PUT",
                uploadUrl,
                true,
            );

            request.setRequestHeader(
                "Content-Type",
                file.type ||
                "application/octet-stream",
            );

            request.onload =
                () => {
                    if (
                        request.status >=
                        200 &&
                        request.status <
                        300
                    ) {
                        resolve();
                        return;
                    }

                    reject(
                        new Error(
                            "A Oracle não aceitou o upload do vídeo.",
                        ),
                    );
                };

            request.onerror =
                () =>
                    reject(
                        new Error(
                            "Falha de conexão durante o upload do vídeo.",
                        ),
                    );

            request.send(
                file,
            );
        },
    );
}

function registrationMediaSignature(
    registration:
        AwardRegistrationResponse,
) {
    return [
        registration.status,

        ...registration.entries
            .map(
                (entry) =>
                    `${entry.id}:${entry.mediaStatus}:${entry.sourceType}`,
            )
            .sort(),
    ].join(
        "|",
    );
}

function isValidHttpsUrl(
    value: string,
) {
    try {
        return (
            new URL(
                value,
            ).protocol ===
            "https:"
        );
    } catch {
        return false;
    }
}

function formatBytes(
    bytes: number,
) {
    if (
        bytes <
        1024 * 1024
    ) {
        return `${Math.ceil(
            bytes / 1024,
        )} KB`;
    }

    return `${Math.ceil(
        bytes /
        (1024 * 1024),
    )} MB`;
}