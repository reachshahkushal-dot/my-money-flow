import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, Plus, LogOut, Pencil, Wallet } from "lucide-react";
import { AccountsDialog } from "@/components/AccountsDialog";
import { EditEntryDialog } from "@/components/EditEntryDialog";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CATEGORIES,
  KIND_LABELS,
  KIND_ORDER,
  SOURCE_LABELS,
  STATUS_LABELS,
  formatSGD,
  monthKey,
  monthLabel,
  summarize,
  type Account,
  type Entry,
  type Kind,
} from "@/lib/finance";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Money Ledger — Monthly Income, Spending & Savings" },
      {
        name: "description",
        content:
          "A clean personal finance dashboard: log income, fixed and variable expenses and investments, and see monthly totals and savings at a glance.",
      },
      { property: "og:title", content: "Money Ledger — Monthly Income, Spending & Savings" },
      {
        property: "og:description",
        content: "Log income, expenses and investments weekly and track how much you save each month.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const KIND_DOT: Record<Kind, string> = {
  income: "bg-income",
  fixed: "bg-fixed",
  variable: "bg-variable",
  investment: "bg-investment",
};

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [month, setMonth] = useState(() => monthKey(new Date()));

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null);
      setChecked(true);
      if (!data.session) navigate({ to: "/auth" });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user.id ?? null);
      if (!session) navigate({ to: "/auth" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const { data: entries = [] } = useQuery({
    queryKey: ["entries", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entries")
        .select("*")
        .order("entry_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Entry[];
    },
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Account[];
    },
  });

  const accountName = useMemo(
    () => Object.fromEntries(accounts.map((a) => [a.id, a.account_name])) as Record<string, string>,
    [accounts],
  );
  const [editing, setEditing] = useState<Entry | null>(null);


  const months = useMemo(() => {
    const set = new Set<string>([monthKey(new Date())]);
    entries.forEach((e) => set.add(monthKey(e.entry_date)));
    return [...set].sort().reverse();
  }, [entries]);

  const monthEntries = useMemo(
    () => entries.filter((e) => monthKey(e.entry_date) === month),
    [entries, month],
  );
  const summary = useMemo(() => summarize(monthEntries), [monthEntries]);

  const trend = useMemo(() => {
    return months
      .slice(0, 6)
      .reverse()
      .map((m) => ({ month: m, ...summarize(entries.filter((e) => monthKey(e.entry_date) === m)) }));
  }, [months, entries]);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["entries", userId] }),
  });

  if (!checked || !userId) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  }

  const maxTrend = Math.max(1, ...trend.map((t) => Math.max(t.income, t.spent + t.investment)));

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-5 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Money Ledger</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Update it weekly. See where the month lands.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-[190px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m} value={m}>
                  {monthLabel(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <AccountsDialog
            userId={userId}
            accounts={accounts}
            trigger={
              <Button variant="outline" size="sm">
                <Wallet className="mr-1 size-4" />
                Accounts
              </Button>
            }
          />
          <Button variant="ghost" size="icon" aria-label="Sign out" onClick={() => supabase.auth.signOut()}>
            <LogOut className="size-4" />
          </Button>
        </div>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Income" value={summary.income} accent="income" />
        <SummaryCard label="Fixed expenses" value={summary.fixed} accent="fixed" />
        <SummaryCard label="Variable expenses" value={summary.variable} accent="variable" />
        <SummaryCard label="Invested" value={summary.investment} accent="investment" />
      </section>

      <section className="surface-card mt-4 flex flex-wrap items-center justify-between gap-6 p-6">
        <div>
          <p className="text-sm text-muted-foreground">Left over after spending &amp; investing</p>
          <p className="mt-1 text-4xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
            {formatSGD(summary.saved)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Kept from income (saved + invested)</p>
          <p className="mt-1 text-2xl font-semibold text-primary">{summary.savingsRate.toFixed(0)}%</p>
        </div>
      </section>

      <div className="mt-10 grid gap-8 lg:grid-cols-[380px_1fr]">
        <AddEntryForm
          userId={userId}
          accounts={accounts}
          entries={entries}
          onAdded={(m) => { setMonth(m); queryClient.invalidateQueries({ queryKey: ["entries", userId] }); }}
        />

        <div className="space-y-8">
          {trend.length > 1 && (
            <section className="surface-card p-6">
              <h2 className="text-base font-semibold">Monthly trend</h2>
              <div className="mt-5 flex items-end gap-5">
                {trend.map((t) => (
                  <div key={t.month} className="flex flex-1 flex-col items-center gap-2">
                    <div className="flex h-32 w-full items-end justify-center gap-1">
                      <div
                        className="w-1/3 rounded-t bg-income"
                        style={{ height: `${(t.income / maxTrend) * 100}%` }}
                        title={`Income ${formatSGD(t.income)}`}
                      />
                      <div
                        className="w-1/3 rounded-t bg-variable"
                        style={{ height: `${((t.spent + t.investment) / maxTrend) * 100}%` }}
                        title={`Out ${formatSGD(t.spent + t.investment)}`}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{monthLabel(t.month).slice(0, 3)}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-muted-foreground">Green = money in · Orange = money out (spent + invested)</p>
            </section>
          )}

          <CategoryBreakdown entries={monthEntries} />

          <section className="surface-card p-6">
            <h2 className="text-base font-semibold">{monthLabel(month)} entries</h2>
            {monthEntries.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">Nothing logged yet for this month.</p>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {monthEntries.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 py-3">
                    <span className={`size-2 rounded-full ${KIND_DOT[e.kind]}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{e.category}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {new Date(e.entry_date + "T00:00:00").toLocaleDateString("en-SG", {
                          day: "numeric",
                          month: "short",
                        })}
                        {e.description ? ` · ${e.description}` : ""}
                        {e.note ? ` · ${e.note}` : ""}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground/70">
                        {[
                          KIND_LABELS[e.kind],
                          e.account_id ? accountName[e.account_id] : null,
                          SOURCE_LABELS[e.source] ?? e.source,
                          STATUS_LABELS[e.status] ?? e.status,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">
                      {e.kind === "income" ? "+" : "−"}
                      {formatSGD(Number(e.amount)).replace("SGD", "").trim()}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Edit entry"
                      onClick={() => setEditing(e)}
                    >
                      <Pencil className="size-4 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete entry"
                      onClick={() => remove.mutate(e.id)}
                    >
                      <Trash2 className="size-4 text-muted-foreground" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function SummaryCard({ label, value, accent }: { label: string; value: number; accent: Kind }) {
  return (
    <div className="surface-card p-5">
      <div className="flex items-center gap-2">
        <span className={`size-2 rounded-full ${KIND_DOT[accent]}`} />
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{formatSGD(value)}</p>
    </div>
  );
}

function CategoryBreakdown({ entries }: { entries: Entry[] }) {
  const groups = KIND_ORDER.filter((k) => k !== "income").map((kind) => {
    const rows = new Map<string, number>();
    entries
      .filter((e) => e.kind === kind)
      .forEach((e) => rows.set(e.category, (rows.get(e.category) ?? 0) + Number(e.amount)));
    const total = [...rows.values()].reduce((a, b) => a + b, 0);
    return { kind, total, rows: [...rows.entries()].sort((a, b) => b[1] - a[1]) };
  });

  const hasData = groups.some((g) => g.rows.length > 0);
  if (!hasData) return null;

  return (
    <section className="surface-card p-6">
      <h2 className="text-base font-semibold">Where the money went</h2>
      <div className="mt-4 space-y-6">
        {groups
          .filter((g) => g.rows.length > 0)
          .map((g) => (
            <div key={g.kind}>
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-medium">{KIND_LABELS[g.kind]}</p>
                <p className="text-sm tabular-nums text-muted-foreground">{formatSGD(g.total)}</p>
              </div>
              <ul className="mt-3 space-y-2">
                {g.rows.map(([cat, amt]) => (
                  <li key={cat} className="flex items-center gap-3">
                    <span className="w-44 shrink-0 truncate text-sm text-muted-foreground">{cat}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <span
                        className={`block h-full rounded-full ${KIND_DOT[g.kind]}`}
                        style={{ width: `${(amt / g.total) * 100}%` }}
                      />
                    </span>
                    <span className="w-24 text-right text-sm tabular-nums">{formatSGD(amt)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
      </div>
    </section>
  );
}

function AddEntryForm({ userId, onAdded }: { userId: string; onAdded: (month: string) => void }) {
  const [kind, setKind] = useState<Kind>("variable");
  const [category, setCategory] = useState<string>(CATEGORIES.variable[0]!);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function changeKind(k: Kind) {
    setKind(k);
    setCategory(CATEGORIES[k][0]!);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    setSaving(true);
    const { error: insertError } = await supabase.from("entries").insert({
      user_id: userId,
      kind,
      category,
      amount: value,
      entry_date: date,
      note: note.trim() || null,
    });
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setAmount("");
    setNote("");
    onAdded(monthKey(date));
  }

  return (
    <form onSubmit={submit} className="surface-card h-fit p-6 lg:sticky lg:top-8">
      <h2 className="text-base font-semibold">Add an entry</h2>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {KIND_ORDER.map((k) => (
          <Button
            key={k}
            type="button"
            variant={kind === k ? "default" : "outline"}
            className="justify-start text-xs"
            onClick={() => changeKind(k)}
          >
            <span className={`mr-2 size-2 rounded-full ${KIND_DOT[k]}`} />
            {KIND_LABELS[k]}
          </Button>
        ))}
      </div>

      <div className="mt-5 space-y-4">
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES[kind].map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (SGD)</Label>
            <Input
              id="amount"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="note">Note (optional)</Label>
          <Input id="note" placeholder="e.g. Koufu lunch" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={saving}>
          <Plus className="mr-1 size-4" />
          Add {KIND_LABELS[kind].toLowerCase()}
        </Button>
      </div>
    </form>
  );
}
