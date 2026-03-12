"use client";

export function PrintButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-10 items-center rounded-xl border border-border/70 bg-background/70 px-4 text-sm font-medium text-foreground/80 shadow-sm backdrop-blur-sm transition-colors hover:bg-background hover:text-foreground"
    >
      {label}
    </button>
  );
}
