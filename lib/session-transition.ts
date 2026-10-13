"use client";

let ending = false;
let revision = 0;
const CHANNEL = "dna:session-ended";
const TAB_ID = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

export function isSessionEnding() { return ending; }
export function sessionRevision() { return revision; }
export function beginSessionEnd() { ending = true; revision += 1; }
export function resumeSession() { ending = false; }

export function clearAccountStorage() {
  try { localStorage.removeItem("dna:award-processing"); } catch { /* Storage is optional. */ }
  try { sessionStorage.removeItem("dna:award-notice"); } catch { /* Storage is optional. */ }
}

export function notifySessionEnded() {
  try {
    const channel = new BroadcastChannel(CHANNEL);
    channel.postMessage({ type: "ended", source: TAB_ID });
    channel.close();
  } catch { /* Other tabs will also be rejected by the API. */ }
}

export function listenForSessionEnd() {
  let channel: BroadcastChannel | undefined;
  try {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (event) => {
      if (event.data?.type !== "ended" || event.data.source === TAB_ID) return;
      beginSessionEnd();
      clearAccountStorage();
      window.location.replace("/entrar");
    };
  } catch { /* BroadcastChannel is optional. */ }
  const onPageShow = (event: PageTransitionEvent) => {
    if (event.persisted) window.location.reload();
  };
  window.addEventListener("pageshow", onPageShow);
  return () => {
    channel?.close();
    window.removeEventListener("pageshow", onPageShow);
  };
}
