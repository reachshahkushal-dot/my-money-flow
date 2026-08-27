# Phase 1 — Stronger Data Model + Transaction Ledger

Current state (verified): one `entries` table with 7 rows for August 2026 — Income 3,500, Fixed 2,360 (Rent 1,100, Loan/EMI 1,200, Utilities 30, Subscriptions 20, Mobile 10), Variable 27, Investments 0. The dashboard reads these directly in `src/routes/index.tsx`; categories live in `src/lib/finance.ts`.

## Database changes

Extend the existing `entries` table in place — no rebuild, no data deletion, no duplicate rows.

New columns on `entries`:
- `description` (merchant/description, optional text)
- `source` — Manual / Imported / System, default Manual
- `status` — Confirmed / Pending / Needs review, default Confirmed
- `account_id` — optional link to an account
- `currency` — default SGD
- `external_transaction_id` — optional, for future imports
- `is_shared` (false by default) and `shared_reference` (optional) — placeholders for future Splitwise work
- `updated_at` with an auto-update trigger

Backfill for all 7 existing rows: source = Manual, status = Confirmed, currency = SGD, account left empty. `kind` and `category` keep their current values, so every dashboard total stays identical.

New `accounts` table: account_name, institution, account_type (bank / cash / credit_card / other), currency, opening_balance, is_active, timestamps. Private per user, same access rules as entries. No accounts are auto-created; the user creates their own.

## UI changes (kept minimal)

- **Add an entry form**: keep the four type buttons, category, amount, date, note. Add an optional Description/merchant field and an optional Account dropdown (with an inline "Add account" option). Both can be left blank.
- **Duplicate protection**: before insert, check for a transaction with the same date, amount, category and description created in the last few minutes. If found, show "Possible duplicate transaction" with Continue / Cancel — never auto-merge or delete.
- **Transaction list**: same layout, plus a subtle second line showing account · source · status when present. Each row gets an edit action next to delete.
- **Edit dialog**: modify type, category, amount, date, account, description and note. Updates the same row in place (same id), sets `updated_at`.
- **Accounts management**: a small section/dialog to create and deactivate accounts (name, institution, type, currency, opening balance).

## Explicitly out of scope

No changes to how totals, savings or the trend chart are computed. No net cashflow, receivables, payables, balances, forecasting, bank/Splitwise imports, or AI.

## Verification

After the change I will run through the acceptance tests: August totals unchanged (3,500 / 2,360 / 27 / 0), create income, variable expense with merchant, and investment entries dated 27 Aug on DBS Current, edit an amount (same row, no duplicate), delete a row, create an account and link a transaction, and confirm new manual entries store source = Manual and status = Confirmed.
