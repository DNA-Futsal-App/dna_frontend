"use client";

import type { ApiProblem } from "@/lib/types";
import {
  clearClientSession,
  getClientAccessToken,
} from "@/lib/client-session";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export class ClientApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public problem?: ApiProblem,
  ) {
    super(message);
  }
}

function resolveApiUrl(url: string) {
  if (/^https?:\/\//.test(url)) return url;

  if (!API_BASE_URL) {
    throw new Error("NEXT_PUBLIC_API_URL não foi configurada.");
  }

  return `${API_BASE_URL.replace(/\/$/, "")}/${url.replace(/^\//, "")}`;
}


export async function clientApi<T>(url: string, init?: RequestInit): Promise<T> {
  const accessToken = getClientAccessToken();

  const response = await fetch(resolveApiUrl(url), {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init?.headers,
    },
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
      !url.includes("/auth/")
    ) {
      sessionStorage.removeItem("dna.accessToken");
      window.dispatchEvent(new CustomEvent("dna:session-expired"));
    }

    throw new ClientApiError(
      problem.detail ?? "Não foi possível concluir a solicitação.",
      response.status,
      problem,
    );
  }

  return data as T;
}

export function formatDate(value: string, options?: Intl.DateTimeFormatOptions) {
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
