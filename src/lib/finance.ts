export type Kind = "income" | "fixed" | "variable" | "investment";

export type Source = "manual" | "imported" | "system";
export type Status = "confirmed" | "pending" | "needs_review";
export type AccountType = "bank" | "cash" | "credit_card" | "other";

export type Entry = {
  id: string;
  user_id: string;
  kind: Kind;
  category: string;
  note: string | null;
  description: string | null;
  amount: number;
  entry_date: string;
  created_at: string;
  updated_at: string;
  source: Source;
  status: Status;
  account_id: string | null;
  currency: string;
  external_transaction_id: string | null;
  is_shared: boolean;
  shared_reference: string | null;
};

export type Account = {
  id: string;
  user_id: string;
  account_name: string;
  institution: string | null;
  account_type: AccountType;
  currency: string;
  opening_balance: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export const SOURCE_LABELS: Record<Source, string> = {
  manual: "Manual",
  imported: "Imported",
  system: "System",
};

export const STATUS_LABELS: Record<Status, string> = {
  confirmed: "Confirmed",
  pending: "Pending",
  needs_review: "Needs review",
};

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  bank: "Bank account",
  cash: "Cash",
  credit_card: "Credit card",
  other: "Other",
};

export const KIND_LABELS: Record<Kind, string> = {
  income: "Income",
  fixed: "Fixed expenses",
  variable: "Variable expenses",
  investment: "Investments",
};

// Categories derived from the uploaded DBS/POSB transaction history
// (hawker & food courts, MRT/bus, NTUC groceries, Simba telco, PayNow transfers, retail).
export const CATEGORIES: Record<Kind, string[]> = {
  income: ["Salary / stipend", "Freelance", "Reimbursements", "Money received (PayNow)", "Other income"],
  fixed: ["Rent", "Mobile plan (Simba)", "Utilities", "Subscriptions", "Insurance", "Loan / EMI"],
  variable: [
    "Food & hawker",
    "Groceries (NTUC / FairPrice)",
    "Transport (MRT & bus)",
    "Shopping & apparel",
    "Cafes & drinks",
    "Personal care",
    "Travel & duty free",
    "Transfers to friends",
    "Other",
  ],
  investment: ["Stocks / ETFs", "Recurring plan (RSP)", "Crypto", "Savings account", "Gold", "Other investment"],
};

export const KIND_ORDER: Kind[] = ["income", "fixed", "variable", "investment"];

export function monthKey(date: string | Date) {
  const d = typeof date === "string" ? new Date(date + "T00:00:00") : date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number) as [number, number];
  return new Date(y, m - 1, 1).toLocaleString("en-SG", { month: "long", year: "numeric" });
}

export function formatSGD(value: number) {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD",
    maximumFractionDigits: 2,
  }).format(value);
}

export type MonthSummary = {
  income: number;
  fixed: number;
  variable: number;
  investment: number;
  spent: number;
  saved: number;
  savingsRate: number;
};

export function summarize(entries: Entry[]): MonthSummary {
  const totals = { income: 0, fixed: 0, variable: 0, investment: 0 };
  for (const e of entries) totals[e.kind] += Number(e.amount);
  const spent = totals.fixed + totals.variable;
  const saved = totals.income - spent - totals.investment;
  return {
    ...totals,
    spent,
    saved,
    savingsRate: totals.income > 0 ? ((saved + totals.investment) / totals.income) * 100 : 0,
  };
}
