"use client";

import type { ApiProblem } from "@/lib/types";

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

  const data =
    response.status === 204
      ? null
      : await response.json().catch(() => null);

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

  return data as T;
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