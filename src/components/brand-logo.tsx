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
  priority = false // priority is no longer used but kept for compatibility
}: BrandLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <svg
        width="40"
        height="40"
        viewBox="0 0 64 64"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("transition-transform duration-300 group-hover:scale-110", markClassName)}
      >
        <rect width="64" height="64" rx="14" className="fill-primary" />
        <path d="M22 44V20H41.5V26H29V30H39V36H29V44H22Z" className="fill-primary-foreground" />
      </svg>

      {showWordmark ? <span className={cn("font-semibold tracking-tight text-foreground", textClassName)}>Freela</span> : null}
    </span>
  );
}
