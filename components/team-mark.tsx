import type { Team } from "@/lib/types";
import { initials } from "@/lib/client-api";

const tones = [
  "from-cyan/25 to-deep/20 text-cyan",
  "from-amber/25 to-coral/15 text-amber",
  "from-ocean/25 to-cyan/10 text-ocean",
];

export function TeamMark({ team, size = "md" }: { team: Team; size?: "sm" | "md" | "lg" }) {
  const tone = tones[team.name.charCodeAt(0) % tones.length];
  const sizing = size === "sm" ? "size-8 text-[10px]" : size === "lg" ? "size-14 text-sm" : "size-10 text-xs";
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br font-black ${tone} ${sizing}`} aria-hidden="true">
      {initials(team.shortName || team.name)}
    </span>
  );
}
