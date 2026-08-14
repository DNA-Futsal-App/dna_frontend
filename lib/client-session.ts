"use client";

const ACCESS_TOKEN_KEY = "dna.accessToken";
const EXPIRES_AT_KEY = "dna.accessTokenExpiresAt";

export function saveClientSession(
  accessToken: string,
  expiresInSeconds: number,
) {
  const expiresAt =
    Date.now() + Math.max(0, expiresInSeconds * 1000 - 5_000);

  sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  sessionStorage.setItem(EXPIRES_AT_KEY, String(expiresAt));
}

export function getClientAccessToken(): string | null {
  if (typeof window === "undefined") return null;

  const token = sessionStorage.getItem(ACCESS_TOKEN_KEY);
  const expiresAt = Number(sessionStorage.getItem(EXPIRES_AT_KEY));

  if (
    !token ||
    !Number.isFinite(expiresAt) ||
    Date.now() >= expiresAt
  ) {
    clearClientSession();
    return null;
  }

  return token;
}

export function hasValidClientSession() {
  return getClientAccessToken() !== null;
}

export function clearClientSession() {
  if (typeof window === "undefined") return;

  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(EXPIRES_AT_KEY);
}