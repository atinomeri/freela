"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { formatGeorgianDateTime } from "@/lib/date";

type UnsubItem = {
  id: string;
  email: string;
  source: string;
  createdAt: string;
};

export function UnsubscribedTable({ initialItems }: { initialItems: UnsubItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const filtered = items.filter((item) =>
    item.email.toLowerCase().includes(search.toLowerCase())
  );

  async function handleDelete(id: string, email: string) {
    if (!confirm(`Remove "${email}" from unsubscribed list?\n\nThis will allow sending emails to this address again.`)) {
      return;
    }

    setDeleting(id);
    try {
      const res = await fetch("/api/unsubscribed", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        setItems((prev) => prev.filter((item) => item.id !== id));
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete");
      }
    } catch (err) {
      alert("Network error");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <Card className="overflow-hidden">
      {/* Search bar */}
      <div className="border-b border-border p-4">
        <input
          type="text"
          placeholder="Search by email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
        />
        {search && (
          <p className="mt-2 text-xs text-muted-foreground">
            Showing {filtered.length} of {items.length} results
          </p>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">#</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Source</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  {items.length === 0 ? "No unsubscribed emails" : "No results found"}
                </td>
              </tr>
            ) : (
              filtered.map((item, idx) => (
                <tr
                  key={item.id}
                  className="border-b border-border/50 transition-colors hover:bg-muted/20"
                >
                  <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium">{item.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      item.source === "link"
                        ? "bg-blue-500/10 text-blue-500"
                        : item.source === "manual"
                          ? "bg-yellow-500/10 text-yellow-500"
                          : "bg-gray-500/10 text-gray-400"
                    }`}>
                      {item.source}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatGeorgianDateTime(item.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(item.id, item.email)}
                      disabled={deleting === item.id}
                      className="rounded-md border border-red-500/30 px-3 py-1 text-xs font-medium text-red-500 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                    >
                      {deleting === item.id ? "..." : "Delete"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
        Total: {items.length} unsubscribed email{items.length !== 1 ? "s" : ""}
      </div>
    </Card>
  );
}
