import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function SectionHeading({ eyebrow, title, href, action = "Ver tudo" }: { eyebrow?: string; title: string; href?: string; action?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        {eyebrow ? <p className="eyebrow mb-1.5">{eyebrow}</p> : null}
        <h2 className="display-title text-2xl font-black text-ivory sm:text-3xl">{title}</h2>
      </div>
      {href ? (
        <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-cyan transition hover:text-white">
          {action}<ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}
