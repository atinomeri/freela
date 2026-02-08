import { Container } from "@/components/ui/container";

export function SitePageOverride({ title, body }: { title: string; body: string }) {
  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto max-w-3xl">
        {title ? <h1 className="text-3xl font-semibold tracking-tight">{title}</h1> : null}
        {body ? <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{body}</div> : null}
      </div>
    </Container>
  );
}

