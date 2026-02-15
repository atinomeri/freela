import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  clickable?: boolean;
}

export function Card({ className, hover = true, clickable = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/70 bg-card/80 text-card-foreground shadow-sm backdrop-blur-sm transition-all duration-200",
        hover && "hover:shadow-soft hover:border-border",
        clickable && "cursor-pointer card-touch",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 p-6", className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-lg font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6 pt-0", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center p-6 pt-0", className)}
      {...props}
    />
  );
}

// Gradient Card variant
export function GradientCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl bg-gradient-to-br from-primary/10 via-transparent to-transparent p-[1px]",
        className
      )}
    >
      <div
        className="h-full w-full rounded-[11px] bg-card p-6"
        {...props}
      />
    </div>
  );
}

// Interactive Card with glow effect
export function GlowCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "group relative rounded-xl border border-border/70 bg-card/80 p-6 text-card-foreground shadow-sm backdrop-blur-sm transition-all duration-300",
        "hover:border-primary/50 hover:shadow-glow-sm",
        className
      )}
      {...props}
    />
  );
}
