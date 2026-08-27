# Layer 1B — Shared Expenses + Debt Ledger

Adds the ability to record an expense you paid on behalf of others, and a separate ledger of what each person owes you. Existing dashboard totals stay exactly as they are.

## Database

New `debts` table (private per user, same access rules as entries):
- person_name, direction (`owes_me` / `i_owe`), amount, remaining_amount
- original_transaction_id → links to the entry (removed together with the entry)
- status (`outstanding` / `partially_settled` / `settled` / `bad_debt`), date, note
- created_at, updated_at with auto-update trigger

The existing `entries` table already has `is_shared`; it will be set to true on shared transactions. `my_share` will be stored as a new optional column on `entries` so the shared section can be re-opened for editing. No other entries changes, no data deleted, no totals affected.

Only `owes_me` records are created in this phase. `i_owe` exists in the model but is not exposed in the UI.

## Add Entry form

For Variable expenses (and Fixed expenses, using the same component so it can be switched on later — hidden for now), after Category / Amount / Date / Merchant:

- **Shared expense?** No (default) / Yes
- When Yes: **My share** field, plus a repeatable **People who owe me** list (person name + amount), with add/remove row buttons
- Validation before save: my share + all people's amounts must equal the transaction amount, otherwise show "Shared amounts must equal the total transaction amount." and block saving. Names must be non-empty and amounts greater than zero.

Saving creates the transaction at the full amount (SGD 60 in the example) and one `owes_me` debt per person, each linked to the transaction, status `outstanding`, remaining_amount = amount, date = transaction date, note = merchant/description.

## Editing a shared transaction

The edit dialog gains the same Shared expense section, pre-filled from the existing debt records:
- Same validation against the new total
- Existing debt rows are updated in place (amount and remaining_amount), rows removed in the UI are deleted, newly added people create new records
- A debt already marked `bad_debt` is not silently revived: its amount is updated but it keeps `bad_debt` status
- No duplicate debt records are ever created for the same person on the same transaction

## Deleting a shared transaction

If the transaction has outstanding debts, show a confirmation first: "This transaction has outstanding shared expenses. Deleting it will also remove the associated debt records." Confirming deletes the transaction and its debt records, so no orphans remain.

## Debt dashboard card

A new **Debt** card on the dashboard:
- "People owe me" — total remaining across all `outstanding` / `partially_settled` debts (bad debt and settled excluded)
- Below it, one line per person with their aggregated outstanding amount
- Clicking the card (or a person) opens a debt detail view listing: Person, Amount owed, Original expense, Date, Status — individual records, never merged away
- Each outstanding record has a **Mark as bad debt** action: sets status `bad_debt` and remaining_amount 0. The original transaction, its amount and all dashboard totals are untouched; no new transaction is created.

## Unchanged

Monthly income / fixed / variable / investment totals, savings, savings rate and the trend chart keep their current behaviour — a shared SGD 60 expense still counts as SGD 60 in Variable expenses.

## Acceptance tests

1. SGD 60 Annalakshmi, my share 30, Ketul 30 → transaction 60, Ketul owes 30
2. Second shared expense SGD 40 (my share 20, Ketul 20) → Ketul shows SGD 50
3. Mark the SGD 30 debt as bad debt → the original transaction unchanged
4. Edit the SGD 40 transaction to SGD 60 (my share 30, Ketul 30) → the same debt record updates to 30, no duplicate created

Note on Test 3 + 4: since a bad debt is permanently excluded from the outstanding total, after step 3 Ketul's outstanding is SGD 20, and after step 4 it becomes SGD 30 (the 30 marked bad stays excluded), not SGD 60. If you'd rather marking bad debt be reversible so it can come back into the total, say so and I'll add an "unmark" action.

## Out of scope

Splitwise, settlements, netting, "I owe people" UI, bank integration, cashflow/Layer 2 changes, AI, forecasting, budgets.
