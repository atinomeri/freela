import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  markClassName?: string;
  textClassName?: string;
  showWordmark?: boolean;
  priority?: boolean;
};

export function BrandLogo({
  className,
  markClassName,
  textClassName,
  showWordmark = true,
  priority = false
}: BrandLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <span
        className={cn(
          "relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-gradient-to-br from-primary/10 via-background to-background shadow-sm ring-1 ring-primary/15",
          markClassName
        )}
      >
        <span className="pointer-events-none absolute inset-0 rounded-[inherit] bg-primary/5" />
        <Image src="/mark.svg" alt="Freela" width={34} height={34} priority={priority} className="relative" />
      </span>

      {showWordmark ? <span className={cn("font-semibold tracking-tight text-foreground", textClassName)}>Freela</span> : null}
    </span>
  );
}
