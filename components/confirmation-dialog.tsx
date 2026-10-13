"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function ConfirmationDialog({ titleId, descriptionId, busy, onDismiss, children }: {
  titleId: string;
  descriptionId: string;
  busy: boolean;
  onDismiss: () => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement;
    element?.showModal();
    element?.querySelector<HTMLButtonElement>("[data-dialog-cancel]")?.focus();
    return () => {
      element?.close();
      queueMicrotask(() => {
        if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
      });
    };
  }, []);

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-busy={busy}
      onCancel={(event) => { event.preventDefault(); if (!busy) onDismiss(); }}
      className="m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-3xl border border-white/15 bg-night p-5 text-ivory shadow-2xl backdrop:bg-black/75 sm:p-7"
    >
      {children}
    </dialog>
  );
}
