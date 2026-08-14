import "server-only";

import { NextRequest, NextResponse } from "next/server";
import type { ApiProblem, AuthResponse } from "@/lib/types";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080").replace(/\/$/, "");
const ACCESS_COOKIE = "dna_access";
const REFRESH_COOKIE = "dna_refresh";
const DEMO_COOKIE = "dna_demo";

type FetchInit = Omit<RequestInit, "headers"> & { headers?: HeadersInit };

const cookieBase = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export function demoEnabled() {
  return process.env.DEMO_MODE === "true";
}

export function isDemoRequest(request: NextRequest) {
  return demoEnabled() && request.cookies.get(DEMO_COOKIE)?.value === "1";
}

export function setDemoCookie(response: NextResponse) {
  response.cookies.set(DEMO_COOKIE, "1", { ...cookieBase, maxAge: 60 * 60 * 12 });
}

export function clearSessionCookies(response: NextResponse) {
  response.cookies.set(ACCESS_COOKIE, "", { ...cookieBase, maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE, "", { ...cookieBase, maxAge: 0 });
  response.cookies.set(DEMO_COOKIE, "", { ...cookieBase, maxAge: 0 });
}

export function hasSessionCookie(request: NextRequest) {
  return Boolean(
    request.cookies.get(ACCESS_COOKIE)?.value ||
      request.cookies.get(REFRESH_COOKIE)?.value ||
      (demoEnabled() && request.cookies.get(DEMO_COOKIE)?.value === "1"),
  );
}

function setSessionCookies(response: NextResponse, auth: AuthResponse) {
  response.cookies.set(ACCESS_COOKIE, auth.accessToken, {
    ...cookieBase,
    maxAge: Math.max(60, auth.expiresIn),
  });
  response.cookies.set(REFRESH_COOKIE, auth.refreshToken, {
    ...cookieBase,
    maxAge: 60 * 60 * 24 * 30,
  });
  response.cookies.set(DEMO_COOKIE, "", { ...cookieBase, maxAge: 0 });
}

async function callBackend(path: string, init: FetchInit = {}) {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  headers.set("Accept", "application/json, application/problem+json");

  return fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
}

async function toNextResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "application/json";
  const body = response.status === 204 ? null : await response.text();
  return new NextResponse(body, {
    status: response.status,
    headers: body ? { "Content-Type": contentType } : undefined,
  });
}

export function unavailableResponse() {
  const problem: ApiProblem = {
    title: "Serviço temporariamente indisponível",
    status: 503,
    detail: "Não foi possível conectar ao servidor do DNA Futsal. Tente novamente em instantes.",
    code: "BACKEND_UNAVAILABLE",
  };
  return NextResponse.json(problem, { status: 503 });
}

export async function proxyPublic(path: string, init: FetchInit = {}) {
  try {
    return await toNextResponse(await callBackend(path, init));
  } catch {
    return unavailableResponse();
  }
}

export async function createLoginResponse(response: Response) {
  if (!response.ok) return toNextResponse(response);
  const auth = (await response.json()) as AuthResponse;
  const nextResponse = NextResponse.json({ user: auth.user });
  setSessionCookies(nextResponse, auth);
  return nextResponse;
}

export async function loginWithBackend(payload: unknown) {
  try {
    return await createLoginResponse(
      await callBackend("/api/v1/auth/login", { method: "POST", body: JSON.stringify(payload) }),
    );
  } catch {
    return unavailableResponse();
  }
}

async function refreshSession(refreshToken: string) {
  const response = await callBackend("/api/v1/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
  if (!response.ok) return null;
  return (await response.json()) as AuthResponse;
}

async function authorizedCall(path: string, accessToken: string, init: FetchInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  return callBackend(path, { ...init, headers });
}

export async function proxyAuthenticated(
  request: NextRequest,
  path: string,
  init: FetchInit = {},
) {
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  if (!accessToken && !refreshToken) {
    return NextResponse.json(
      { title: "Sessão necessária", status: 401, detail: "Entre novamente para continuar.", code: "SESSION_REQUIRED" },
      { status: 401 },
    );
  }

  try {
    let auth: AuthResponse | null = null;
    let response = accessToken
      ? await authorizedCall(path, accessToken, init)
      : new Response(null, { status: 401 });

    if (response.status === 401 && refreshToken) {
      auth = await refreshSession(refreshToken);
      if (auth) response = await authorizedCall(path, auth.accessToken, init);
    }

    const nextResponse = await toNextResponse(response);
    if (auth) setSessionCookies(nextResponse, auth);
    if (response.status === 401 && !auth) clearSessionCookies(nextResponse);
    return nextResponse;
  } catch {
    return unavailableResponse();
  }
}

export async function authenticatedBatch(
  request: NextRequest,
  paths: Record<string, string>,
) {
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!accessToken && !refreshToken) {
    return NextResponse.json(
      { title: "Sessão necessária", status: 401, detail: "Entre novamente para continuar.", code: "SESSION_REQUIRED" },
      { status: 401 },
    );
  }

  const execute = (token: string) =>
    Promise.all(
      Object.entries(paths).map(async ([key, path]) => [key, await authorizedCall(path, token)] as const),
    );

  try {
    let auth: AuthResponse | null = null;
    let responses = accessToken ? await execute(accessToken) : [];
    if ((!responses.length || responses.some(([, response]) => response.status === 401)) && refreshToken) {
      auth = await refreshSession(refreshToken);
      if (auth) responses = await execute(auth.accessToken);
    }

    const failed = responses.find(([, response]) => !response.ok);
    if (failed) {
      const nextResponse = await toNextResponse(failed[1]);
      if (auth) setSessionCookies(nextResponse, auth);
      if (failed[1].status === 401 && !auth) clearSessionCookies(nextResponse);
      return nextResponse;
    }

    const data = Object.fromEntries(
      await Promise.all(responses.map(async ([key, response]) => [key, await response.json()])),
    );
    const nextResponse = NextResponse.json(data, {
      headers: { "Cache-Control": "private, max-age=20, stale-while-revalidate=40" },
    });
    if (auth) setSessionCookies(nextResponse, auth);
    return nextResponse;
  } catch {
    return unavailableResponse();
  }
}

export async function logoutFromBackend(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (refreshToken) {
    try {
      await callBackend("/api/v1/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // A sessão local ainda deve ser encerrada quando o backend estiver fora.
    }
  }
  const response = new NextResponse(null, { status: 204 });
  clearSessionCookies(response);
  return response;
}
