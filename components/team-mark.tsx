/* eslint-disable */
"use client";

import { Shield } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { resolveLocalTeamLogo } from "@/lib/team-logo-resolver";
import type { Team } from "@/lib/types";

type Size = "xs" | "sm" | "md" | "lg";
type Props = { team: Team; size?: Size };

function approvedLogo(value?: string | null): string | null {
  if (!value?.trim()) return null;

  const raw = value.trim();

  if (raw.startsWith("/") && !raw.startsWith("//")) {
    return raw;
  }

  try {
    const url = new URL(raw);

    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password
    ) {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}

export function TeamMark({ team, size = "md" }: Props) {
  const preferredSrc = approvedLogo(
    team.preferredLogoUrl,
  );
  const upstreamSrc = approvedLogo(
    team.logoUrl,
  );
  const [localSrc, setLocalSrc] =
    useState<string | null>(null);

  const logoLookupName =
    team.sourceName ??
    team.name;

  useEffect(() => {
    let active = true;

    setLocalSrc(null);

    void resolveLocalTeamLogo(
      logoLookupName,
      team.shortName,
    )
      .then((resolved) => {
        if (active) {
          setLocalSrc(resolved);
        }
      })
      .catch(() => {
        if (active) {
          setLocalSrc(null);
        }
      });

    return () => {
      active = false;
    };
  }, [
    logoLookupName,
    team.shortName,
  ]);

  const sources = useMemo(
    () =>
      [
        ...new Set(
          [
            preferredSrc,
            localSrc,
            upstreamSrc,
          ].filter(
            (
              value,
            ): value is string =>
              Boolean(value),
          ),
        ),
      ],
    [
      preferredSrc,
      localSrc,
      upstreamSrc,
    ],
  );

  return (
    <BadgeImage
      key={`${team.id}:${sources.join("|") || "empty"}`}
      sources={sources}
      size={size}
    />
  );
}

function BadgeImage({ sources, size }: { sources: string[]; size: Size }) {
  const [sourceIndex, setSourceIndex] = useState(0);
  const pixels = { xs: 20, sm: 32, md: 40, lg: 56 }[size];
  const sizing = {
    xs: "size-5",
    sm: "size-8",
    md: "size-10",
    lg: "size-14",
  }[size];
  const src = sources[sourceIndex] ?? null;

  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-muted ${sizing}`}
    >
      {src ? (
        <>
          <img
            src={src}
            alt=""
            width={pixels}
            height={pixels}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-contain p-0.5"
            onError={() => setSourceIndex((current) => current + 1)}
          />
        </>
      ) : (
        <Shield className={size === "xs" ? "size-3.5" : "size-5"} />
      )}
    </span>
  );
}
