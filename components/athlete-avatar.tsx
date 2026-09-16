"use client";

import Image from "next/image";
import { User } from "lucide-react";
import { useState } from "react";

type Props = {
  imageUrl?: string | null;
  personalDataSuppressed?: boolean;
  size?: "sm" | "md" | "lg";
};

function approvedPhoto(value?: string | null): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    return (url.protocol === "http:" || url.protocol === "https:") &&
      url.hostname === "admfutsal.com.br" && !url.port &&
      !url.username && !url.password &&
      url.pathname.startsWith("/assets/images/foto/atleta/")
      ? url.href : null;
  } catch {
    return null;
  }
}

export function AthleteAvatar({ imageUrl, personalDataSuppressed = false, size = "md" }: Props) {
  const src = personalDataSuppressed ? null : approvedPhoto(imageUrl);
  // A new URL remounts the inner component and resets its error state.
  return <AvatarImage key={src ?? "empty"} src={src} size={size} />;
}

function AvatarImage({ src, size }: { src: string | null; size: "sm" | "md" | "lg" }) {
  const [failed, setFailed] = useState(false);
  const pixels = { sm: 32, md: 40, lg: 56 }[size];
  const sizing = { sm: "size-8", md: "size-10", lg: "size-14" }[size];

  return (
    <span aria-hidden="true" className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/5 text-muted ${sizing}`}>
      {src && !failed ? (
        <Image src={src} alt="" fill sizes={`${pixels}px`} className="object-cover" onError={() => setFailed(true)} />
      ) : <User className={size === "lg" ? "size-7" : "size-5"} />}
    </span>
  );
}
