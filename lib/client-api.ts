"use client";

import { applyTeamDisplayOverrides } from "@/lib/team-display";
import type { ApiProblem } from "@/lib/types";
import { isSessionEnding, sessionRevision } from "@/lib/session-transition";

export class ClientApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public problem?: ApiProblem,
  ) {
    super(message);

    this.name = "ClientApiError";
  }
}

export async function clientApi<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  if (!url.startsWith("/api/")) {
    throw new Error(
      `clientApi aceita apenas rotas do BFF iniciadas por /api/. Recebido: ${url}`,
    );
  }

  const headers = new Headers(init?.headers);
  const authRequest = url.startsWith("/api/auth/");
  const revision = sessionRevision();
  if (!authRequest && isSessionEnding()) {
    throw new DOMException("Sessão sendo encerrada.", "AbortError");
  }

  headers.set(
    "Accept",
    "application/json, application/problem+json",
  );

  if (
    init?.body &&
    !headers.has("Content-Type") &&
    !(init.body instanceof FormData)
  ) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...init,
    headers,
    credentials: "same-origin",
  });

  if (!authRequest && (isSessionEnding() || revision !== sessionRevision())) {
    throw new DOMException("Solicitação anterior ao encerramento da sessão.", "AbortError");
  }

  const data =
    response.status === 204
      ? null
      : await response.json().catch(() => null);

  if (!authRequest && (isSessionEnding() || revision !== sessionRevision())) {
    throw new DOMException("Solicitação anterior ao encerramento da sessão.", "AbortError");
  }

  if (!response.ok) {
    const problem = (data ?? {}) as ApiProblem;

    if (
      response.status === 401 &&
      typeof window !== "undefined" &&
      !url.startsWith("/api/auth/")
    ) {
      window.location.replace("/entrar?expired=1");
    }

    throw new ClientApiError(
      problem.detail ??
        "Não foi possível concluir a solicitação.",
      response.status,
      problem,
    );
  }

  return applyTeamDisplayOverrides(
    data as T,
  );
}

export function formatDate(
  value: string,
  options?: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    ...options,
  }).format(new Date(value));
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
