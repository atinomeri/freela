"use client";

import { useToast } from "@/components/ui/toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Facebook, Linkedin, Send } from "lucide-react";

type ShareButtonsProps = {
  url: string;
  title: string;
};

export function ShareButtons({ url, title }: ShareButtonsProps) {
  const { success, error } = useToast();

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
  const telegramUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`;

  const openShare = (shareUrl: string) => {
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      success("Link copied", "Project URL copied to clipboard");
    } catch {
      error("Copy failed", "Could not copy link to clipboard");
    }
  };

  return (
    <Card className="rounded-2xl border-border/70 bg-background/70 p-6 shadow-sm backdrop-blur-sm">
      <div className="text-sm font-medium text-muted-foreground">Share</div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" className="rounded-xl" leftIcon={<Facebook className="h-4 w-4" />} onClick={() => openShare(facebookUrl)}>
          Facebook
        </Button>
        <Button type="button" size="sm" variant="outline" className="rounded-xl" leftIcon={<Linkedin className="h-4 w-4" />} onClick={() => openShare(linkedInUrl)}>
          LinkedIn
        </Button>
        <Button type="button" size="sm" variant="outline" className="rounded-xl" leftIcon={<Send className="h-4 w-4" />} onClick={() => openShare(telegramUrl)}>
          Telegram
        </Button>
        <Button type="button" size="sm" variant="secondary" className="rounded-xl" leftIcon={<Copy className="h-4 w-4" />} onClick={copyLink}>
          Copy link
        </Button>
      </div>
    </Card>
  );
}
