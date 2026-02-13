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
          "relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-border bg-gradient-to-b from-background to-muted/50 shadow-sm ring-1 ring-inset ring-white/10",
          markClassName
        )}
      >
        <Image src="/mark.svg" alt="Freela" width={26} height={26} priority={priority} className="relative transition-transform duration-300 group-hover:scale-110" />
      </span>

      {showWordmark ? <span className={cn("font-semibold tracking-tight text-foreground", textClassName)}>Freela</span> : null}
    </span>
  );
}
