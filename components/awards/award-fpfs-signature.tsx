import Image from "next/image";

export function AwardFpfsSignature({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`inline-flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.035] backdrop-blur-sm ${
        compact ? "px-2.5 py-1.5" : "px-3.5 py-2.5"
      } ${className}`}
      aria-label="Federação Paulista de Futsal"
    >
      <span
        className={`relative grid shrink-0 place-items-center rounded-xl bg-white p-1.5 ${
          compact ? "size-10" : "size-13"
        }`}
      >
        <Image
          src="/premio-dna/Logo%20FPFS.png"
          alt="Logo da Federação Paulista de Futsal"
          width={64}
          height={64}
          className="h-full w-full object-contain"
        />
      </span>

      <span className={compact ? "hidden sm:block" : "block"}>
        <small className="block text-[9px] font-black uppercase tracking-[0.16em] text-muted">
          Federação Paulista
        </small>
        <strong className="mt-0.5 block text-xs font-black text-ivory">
          FPFS
        </strong>
      </span>
    </div>
  );
}
