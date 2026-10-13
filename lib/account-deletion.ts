export type AccountDeletionResponse = {
  status: "PENDING_DELETION";
  requestedAt: string;
  scheduledFor: string;
  message: string;
};

const NOTICE_KEY = "dna:account-deletion-notice";

export function rememberDeletion(response: AccountDeletionResponse) {
  try {
    sessionStorage.setItem(NOTICE_KEY, JSON.stringify({ scheduledFor: response.scheduledFor }));
  } catch {
    // A confirmação também funciona sem armazenamento local.
  }
}

export function clearDeletionNotice() {
  try { sessionStorage.removeItem(NOTICE_KEY); } catch { /* Armazenamento indisponível. */ }
}

export function readDeletionDeadline(): string | null {
  try {
    const notice = JSON.parse(sessionStorage.getItem(NOTICE_KEY) ?? "null");
    if (typeof notice?.scheduledFor !== "string") return null;
    const timestamp = Date.parse(notice.scheduledFor);
    if (!Number.isFinite(timestamp) || timestamp <= Date.now()) return null;
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "long", timeStyle: "long",
    }).format(new Date(timestamp));
  } catch {
    return null;
  }
}
