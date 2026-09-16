"use client";

import Image from "next/image";
import { Shield } from "lucide-react";
import { useState } from "react";
import type { Team } from "@/lib/types";

type Size = "xs" | "sm" | "md" | "lg";
type Props = { team: Team; size?: Size };

function approvedLogo(value?: string | null): string | null {
  if (!value?.trim()) return null;
  const raw = value.trim();
  const path = /^\/team-logos\/[a-f0-9]{64}\.webp$/;
  if (path.test(raw)) return raw;
  try {
    const url = new URL(raw);
    const localHttp = url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
    return (url.protocol === "https:" || localHttp) && path.test(url.pathname) &&
      !url.search && !url.hash && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

export function TeamMark({ team, size = "md" }: Props) {
  const src = approvedLogo(team.logoUrl);
  return <BadgeImage key={`${team.id}:${src ?? "empty"}`} src={src} size={size} />;
}

function BadgeImage({ src, size }: { src: string | null; size: Size }) {
  const [failed, setFailed] = useState(false);
  const pixels = { xs: 20, sm: 32, md: 40, lg: 56 }[size];
  const sizing = { xs: "size-5", sm: "size-8", md: "size-10", lg: "size-14" }[size];

  return (
    <span aria-hidden="true" className={`relative inline-flex shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-muted ${sizing}`}>
      {src && !failed ? (
        <Image src={src} alt="" width={pixels} height={pixels} unoptimized
          className="h-full w-full object-contain p-0.5" onError={() => setFailed(true)} />
      ) : <Shield className={size === "xs" ? "size-3.5" : "size-5"} />}
    </span>
  );
}
