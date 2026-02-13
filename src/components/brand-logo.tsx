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
          "relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-border/50 bg-background shadow-sm",
          markClassName
        )}
      >
        <Image src="/mark.svg" alt="Freela" width={32} height={32} priority={priority} className="relative" />
      </span>

      {showWordmark ? <span className={cn("font-semibold tracking-tight text-foreground", textClassName)}>Freela</span> : null}
    </span>
  );
}
