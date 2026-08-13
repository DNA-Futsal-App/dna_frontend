export function PageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><p className="eyebrow">{eyebrow}</p><h1 className="display-title mt-2 text-4xl font-black leading-none text-ivory sm:text-5xl">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">{description}</p></div>
      {action}
    </div>
  );
}
