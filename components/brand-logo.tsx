import Image from "next/image";

export function BrandLogo({ size = 64, priority = false, className = "" }: { size?: number; priority?: boolean; className?: string }) {
  return (
    <Image
      src="/dna-futsal-logo.webp"
      alt="DNA Futsal"
      width={size}
      height={size}
      priority={priority}
      sizes={`${size}px`}
      className={`rounded-2xl object-contain ${className}`}
    />
  );
}
