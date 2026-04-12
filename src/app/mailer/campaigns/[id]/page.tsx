"use client";

import { useMailerAuth } from "@/lib/mailer-auth";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageSpinner } from "@/components/ui/spinner";
import { ConfirmModal } from "@/components/ui/modal";
import {
  ArrowLeft,
  Send,
  Trash2,
  Link2,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  MousePointerClick,
} from "lucide-react";
import Link from "next/link";
import { MailerLoginPage } from "../../login-page";

interface Campaign {
  id: string;
  name: string;
  subject: string;
  senderName: string | null;
  senderEmail: string | null;
  status: string;
  contactListId: string | null;
  totalCount: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

interface ContactList {
  id: string;
  name: string;
  contactCount: number;
}

interface TrackingStats {
  total_sent: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
  open_rate: number;
  click_rate: number;
}

const STATUS_BADGE: Record<
  string,
  { variant: "default" | "success" | "warning" | "destructive" | "secondary"; label: string }
> = {
  DRAFT: { variant: "secondary", label: "Draft" },
  QUEUED: { variant: "default", label: "Queued" },
  SENDING: { variant: "warning", label: "Sending" },
  PAUSED: { variant: "secondary", label: "Paused" },
  COMPLETED: { variant: "success", label: "Completed" },
  FAILED: { variant: "destructive", label: "Failed" },
};

export default function CampaignDetailPage() {
  const { user, apiFetch } = useMailerAuth();
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [contactLists, setContactLists] = useState<ContactList[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [showAssignList, setShowAssignList] = useState(false);
  const [tracking, setTracking] = useState<TrackingStats | null>(null);

  const loadCampaign = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/desktop/campaigns/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setCampaign(data.data);
      } else {
        setError("Campaign not found");
      }
    } catch {
      setError("Failed to load campaign");
    } finally {
      setLoading(false);
    }
  }, [apiFetch, params.id]);

  const loadContactLists = useCallback(async () => {
    try {
      const res = await apiFetch("/api/desktop/contact-lists?limit=100");
      if (res.ok) {
        const data = await res.json();
        setContactLists(data.data);
      }
    } catch {
      // ignore
    }
  }, [apiFetch]);

  const loadTracking = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/tracking/stats?campaign_id=${params.id}`);
      if (res.status === 404) {
        setTracking(null);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setTracking(data);
      } else {
        setTracking(null);
      }
    } catch {
      // ignore tracking errors
    }
  }, [apiFetch, params.id]);

  useEffect(() => {
    if (user) {
      loadCampaign();
      loadContactLists();
      loadTracking();
    }
  }, [user, loadCampaign, loadContactLists, loadTracking]);

  // Auto-refresh while sending
  useEffect(() => {
    if (campaign?.status !== "SENDING" && campaign?.status !== "QUEUED") return;
    const interval = setInterval(() => {
      void loadCampaign();
      void loadTracking();
    }, 5000);
    return () => clearInterval(interval);
  }, [campaign?.status, loadCampaign, loadTracking]);

  if (!user) return <MailerLoginPage />;

  async function handleAssignList(listId: string) {
    setActionLoading(true);
    setError("");
    try {
      const res = await apiFetch(`/api/desktop/campaigns/${params.id}/assign-list`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactListId: listId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to assign list");
      }
      setShowAssignList(false);
      await loadCampaign();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to assign list");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSend() {
    setActionLoading(true);
    setError("");
    try {
      const res = await apiFetch(`/api/desktop/campaigns/${params.id}/send`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to send campaign");
      }
      setShowSendConfirm(false);
      await loadCampaign();
      await loadTracking();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    setActionLoading(true);
    try {
      const res = await apiFetch(`/api/desktop/campaigns/${params.id}`, {
        method: "DELETE",
      });
      if (res.ok || res.status === 204) {
        router.push("/mailer/campaigns");
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body.error || "Failed to delete");
      }
    } catch {
      setError("Failed to delete campaign");
    } finally {
      setActionLoading(false);
      setShowDeleteConfirm(false);
    }
  }

  if (loading) return <PageSpinner />;

  if (!campaign) {
    return (
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-muted-foreground">Campaign not found</p>
        <Link href="/mailer/campaigns" className="mt-2 inline-block text-sm text-primary hover:underline">
          Back to campaigns
        </Link>
      </div>
    );
  }

  const badge = STATUS_BADGE[campaign.status] ?? STATUS_BADGE.DRAFT;
  const isDraft = campaign.status === "DRAFT";
  const isSending = campaign.status === "SENDING";
  const isCompleted = campaign.status === "COMPLETED";
  const isFailed = campaign.status === "FAILED";
  const progress =
    campaign.totalCount > 0
      ? Math.round(((campaign.sentCount + campaign.failedCount) / campaign.totalCount) * 100)
      : 0;

  const assignedList = contactLists.find((l) => l.id === campaign.contactListId);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link
          href="/mailer/campaigns"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to campaigns
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Header */}
      <Card className="p-6" hover={false}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">{campaign.name}</h1>
              <Badge variant={badge.variant} dot>
                {badge.label}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{campaign.subject}</p>
            {campaign.senderName && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                From: {campaign.senderName}{" "}
                {campaign.senderEmail && `<${campaign.senderEmail}>`}
              </p>
            )}
          </div>

          {isDraft && (
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Contact list assignment */}
      <Card className="mt-4 p-6" hover={false}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Contact List</h2>
            {assignedList ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {assignedList.name} ({assignedList.contactCount} contacts)
              </p>
            ) : campaign.contactListId ? (
              <p className="mt-1 text-sm text-muted-foreground">
                List assigned ({campaign.totalCount} contacts)
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">No list assigned</p>
            )}
          </div>
          {isDraft && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAssignList(!showAssignList)}
            >
              <Link2 className="h-4 w-4" />
              {campaign.contactListId ? "Change" : "Assign"}
            </Button>
          )}
        </div>

        {/* Assign list dropdown */}
        {showAssignList && (
          <div className="mt-4 space-y-2 border-t border-border pt-4">
            {contactLists.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No contact lists available.{" "}
                <Link href="/mailer/contacts" className="text-primary hover:underline">
                  Create one first
                </Link>
              </p>
            ) : (
              contactLists.map((list) => (
                <button
                  key={list.id}
                  onClick={() => handleAssignList(list.id)}
                  disabled={actionLoading}
                  className="flex w-full items-center justify-between rounded-lg border border-border p-3 text-left text-sm transition-colors hover:bg-muted disabled:opacity-50"
                >
                  <span className="font-medium">{list.name}</span>
                  <span className="text-muted-foreground">{list.contactCount} contacts</span>
                </button>
              ))
            )}
          </div>
        )}
      </Card>

      {/* Progress (for sending/completed/failed) */}
      {(isSending || isCompleted || isFailed) && (
        <Card className="mt-4 p-6" hover={false}>
          <h2 className="mb-4 text-sm font-semibold">Sending Progress</h2>

          <Progress value={progress} className="mb-3" showLabel />

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="flex items-center justify-center gap-1 text-success">
                <CheckCircle className="h-4 w-4" />
                <span className="text-xl font-semibold">{campaign.sentCount}</span>
              </div>
              <div className="text-xs text-muted-foreground">Sent</div>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 text-destructive">
                <XCircle className="h-4 w-4" />
                <span className="text-xl font-semibold">{campaign.failedCount}</span>
              </div>
              <div className="text-xs text-muted-foreground">Failed</div>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="text-xl font-semibold">
                  {campaign.totalCount - campaign.sentCount - campaign.failedCount}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">Remaining</div>
            </div>
          </div>

          {campaign.startedAt && (
            <p className="mt-4 text-xs text-muted-foreground">
              Started: {new Date(campaign.startedAt).toLocaleString()}
            </p>
          )}
          {campaign.completedAt && (
            <p className="text-xs text-muted-foreground">
              Completed: {new Date(campaign.completedAt).toLocaleString()}
            </p>
          )}
        </Card>
      )}

      {/* Tracking stats */}
      {tracking && (
        <Card className="mt-4 p-6" hover={false}>
          <h2 className="mb-4 text-sm font-semibold">Tracking Stats</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-border p-3">
              <div className="text-xs text-muted-foreground">Open Rate</div>
              <div className="mt-1 flex items-center gap-1 text-base font-semibold">
                <Eye className="h-4 w-4 text-primary" />
                {tracking.open_rate}%
              </div>
              <div className="text-xs text-muted-foreground">{tracking.opened} opens</div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="text-xs text-muted-foreground">Click Rate</div>
              <div className="mt-1 flex items-center gap-1 text-base font-semibold">
                <MousePointerClick className="h-4 w-4 text-primary" />
                {tracking.click_rate}%
              </div>
              <div className="text-xs text-muted-foreground">{tracking.clicked} clicks</div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="text-xs text-muted-foreground">Bounced</div>
              <div className="mt-1 text-base font-semibold text-destructive">
                {tracking.bounced}
              </div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="text-xs text-muted-foreground">Unsubscribed</div>
              <div className="mt-1 text-base font-semibold">{tracking.unsubscribed}</div>
            </div>
          </div>
        </Card>
      )}

      {/* Send button */}
      {isDraft && campaign.contactListId && (
        <div className="mt-6 flex justify-end">
          <Button onClick={() => setShowSendConfirm(true)}>
            <Send className="h-4 w-4" />
            Send Campaign
          </Button>
        </div>
      )}

      {/* Confirm modals */}
      <ConfirmModal
        isOpen={showSendConfirm}
        onClose={() => setShowSendConfirm(false)}
        onConfirm={handleSend}
        title="Send Campaign"
        description={`This will send "${campaign.name}" to ${campaign.totalCount} recipients. This action cannot be undone.`}
        confirmText="Send Now"
        loading={actionLoading}
      />

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Campaign"
        description="Are you sure you want to delete this campaign? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        loading={actionLoading}
      />
    </div>
  );
}
