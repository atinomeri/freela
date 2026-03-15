"use client";

import { useState } from "react";

export function TopupForm() {
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          amount: Math.round(Number(amount) * 100), // GEL → тетри
        }),
      });

      const data = await res.json();

      if (res.ok) {
        const balanceGEL = (data.new_balance / 100).toFixed(2);
        setResult({
          ok: true,
          message: `✓ Баланс пополнен. ${data.email}: ${balanceGEL} GEL`,
        });
        setAmount("");
      } else {
        setResult({
          ok: false,
          message: data.error?.message || data.error || "Something went wrong",
        });
      }
    } catch {
      setResult({ ok: false, message: "Network error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 max-w-md">
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Email (Desktop User)
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="user@example.com"
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">
          Amount (GEL)
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          min="0.01"
          step="0.01"
          placeholder="10.00"
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
        />
        {amount && Number(amount) > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            = {Math.round(Number(amount) * 100)} тетри
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {loading ? "Processing..." : "Top Up Balance"}
      </button>

      {result && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            result.ok
              ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
          }`}
        >
          {result.message}
        </div>
      )}
    </form>
  );
}
