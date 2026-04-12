"use client";

import { useMailerAuth } from "@/lib/mailer-auth";
import { useEffect, useState, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSpinner } from "@/components/ui/spinner";
import { ConfirmModal, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import {
  Plus,
  Users,
  Upload,
  Trash2,
  ChevronRight,
} from "lucide-react";
import { MailerLoginPage } from "../login-page";

interface ContactList {
  id: string;
  name: string;
  columns: string[];
  emailColumn: string;
  contactCount: number;
  createdAt: string;
}

export default function ContactsPage() {
  const { user, apiFetch } = useMailerAuth();
  const [lists, setLists] = useState<ContactList[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  // Upload state
  const [uploadListId, setUploadListId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Delete state
  const [deleteListId, setDeleteListId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Expand state
  const [expandedList, setExpandedList] = useState<string | null>(null);
  const [contacts, setContacts] = useState<{ email: string; data: Record<string, string> }[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);

  const loadLists = useCallback(async () => {
    try {
      const res = await apiFetch("/api/desktop/contact-lists?limit=100");
      if (res.ok) {
        const data = await res.json();
        setLists(data.data);
      }
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    if (user) loadLists();
  }, [user, loadLists]);

  if (!user) return <MailerLoginPage />;

  async function handleCreateList(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");

    try {
      const res = await apiFetch("/api/desktop/contact-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: createName }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to create list");
      }

      setShowCreate(false);
      setCreateName("");
      await loadLists();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create list");
    } finally {
      setCreating(false);
    }
  }

  async function handleUpload(listId: string) {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadResult(null);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await apiFetch(`/api/desktop/contact-lists/${listId}/contacts`, {
        method: "POST",
        body: formData,
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(body.error || "Upload failed");
      }

      setUploadResult(
        `Imported ${body.data.imported} contacts (${body.data.duplicatesSkipped ?? body.data.skippedDuplicates ?? 0} duplicates skipped)`,
      );
      setUploadListId(null);
      if (fileRef.current) fileRef.current.value = "";
      await loadLists();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    if (!deleteListId) return;
    setDeleting(true);

    try {
      const res = await apiFetch(`/api/desktop/contact-lists/${deleteListId}`, {
        method: "DELETE",
      });
      if (res.ok || res.status === 204) {
        await loadLists();
      }
    } catch {
      // ignore
    } finally {
      setDeleting(false);
      setDeleteListId(null);
    }
  }

  async function toggleExpand(listId: string) {
    if (expandedList === listId) {
      setExpandedList(null);
      setContacts([]);
      return;
    }

    setExpandedList(listId);
    setContactsLoading(true);

    try {
      const res = await apiFetch(
        `/api/desktop/contact-lists/${listId}/contacts?limit=20`,
      );
      if (res.ok) {
        const data = await res.json();
        setContacts(data.data);
      }
    } catch {
      // ignore
    } finally {
      setContactsLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contacts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your contact lists
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" />
          New List
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
          <button className="ml-2 underline" onClick={() => setError("")}>dismiss</button>
        </div>
      )}

      {uploadResult && (
        <div className="mb-4 rounded-lg border border-success/30 bg-success/5 px-3 py-2 text-sm text-success">
          {uploadResult}
          <button className="ml-2 underline" onClick={() => setUploadResult(null)}>dismiss</button>
        </div>
      )}

      {loading ? (
        <PageSpinner />
      ) : lists.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="No contact lists"
          description="Create a list and upload your CSV or XLSX file"
          action={{ label: "New List", onClick: () => setShowCreate(true) }}
        />
      ) : (
        <div className="space-y-3">
          {lists.map((list) => (
            <div key={list.id}>
              <Card className="p-4" hover={false}>
                <div className="flex items-center justify-between gap-4">
                  <button
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    onClick={() => toggleExpand(list.id)}
                  >
                    <ChevronRight
                      className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                        expandedList === list.id ? "rotate-90" : ""
                      }`}
                    />
                    <div className="min-w-0">
                      <h3 className="truncate font-medium">{list.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{list.contactCount} contacts</span>
                        {list.columns.length > 0 && (
                          <>
                            <span>&middot;</span>
                            <span>Columns: {list.columns.join(", ")}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>

                  <div className="flex shrink-0 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setUploadListId(list.id);
                        fileRef.current?.click();
                      }}
                    >
                      <Upload className="h-4 w-4" />
                      Upload
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteListId(list.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                {/* Expanded contacts preview */}
                {expandedList === list.id && (
                  <div className="mt-4 border-t border-border pt-4">
                    {contactsLoading ? (
                      <p className="text-sm text-muted-foreground">Loading...</p>
                    ) : contacts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No contacts yet. Upload a CSV or XLSX file.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border text-left">
                              <th className="pb-2 pr-4 font-medium text-muted-foreground">Email</th>
                              {list.columns
                                .filter((c) => c.toLowerCase() !== list.emailColumn.toLowerCase())
                                .slice(0, 4)
                                .map((col) => (
                                  <th
                                    key={col}
                                    className="pb-2 pr-4 font-medium text-muted-foreground"
                                  >
                                    {col}
                                  </th>
                                ))}
                            </tr>
                          </thead>
                          <tbody>
                            {contacts.map((contact, i) => (
                              <tr key={i} className="border-b border-border/50">
                                <td className="py-2 pr-4">{contact.email}</td>
                                {list.columns
                                  .filter(
                                    (c) =>
                                      c.toLowerCase() !==
                                      list.emailColumn.toLowerCase(),
                                  )
                                  .slice(0, 4)
                                  .map((col) => (
                                    <td
                                      key={col}
                                      className="py-2 pr-4 text-muted-foreground"
                                    >
                                      {contact.data?.[col] ?? "—"}
                                    </td>
                                  ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {list.contactCount > 20 && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            Showing 20 of {list.contactCount} contacts
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={() => {
          if (uploadListId) handleUpload(uploadListId);
        }}
      />

      {/* Create list modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)}>
        <ModalContent size="sm">
          <ModalHeader>New Contact List</ModalHeader>
          <form onSubmit={handleCreateList}>
            <ModalBody>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium">List Name</span>
                <Input
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. Newsletter subscribers"
                  required
                  autoFocus
                />
              </label>
            </ModalBody>
            <ModalFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </Button>
              <Button type="submit" loading={creating}>
                Create
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* Delete confirm */}
      <ConfirmModal
        isOpen={!!deleteListId}
        onClose={() => setDeleteListId(null)}
        onConfirm={handleDelete}
        title="Delete Contact List"
        description="This will permanently delete the list and all its contacts. This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        loading={deleting}
      />
    </div>
  );
}
