CREATE TABLE public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_name text NOT NULL,
  institution text,
  account_type text NOT NULL DEFAULT 'bank',
  currency text NOT NULL DEFAULT 'SGD',
  opening_balance numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT accounts_type_check CHECK (account_type IN ('bank','cash','credit_card','other'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounts TO authenticated;
GRANT ALL ON public.accounts TO service_role;

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own accounts" ON public.accounts
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.entries
  ADD COLUMN description text,
  ADD COLUMN source text NOT NULL DEFAULT 'manual',
  ADD COLUMN status text NOT NULL DEFAULT 'confirmed',
  ADD COLUMN account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  ADD COLUMN currency text NOT NULL DEFAULT 'SGD',
  ADD COLUMN external_transaction_id text,
  ADD COLUMN is_shared boolean NOT NULL DEFAULT false,
  ADD COLUMN shared_reference text,
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.entries
  ADD CONSTRAINT entries_source_check CHECK (source IN ('manual','imported','system')),
  ADD CONSTRAINT entries_status_check CHECK (status IN ('confirmed','pending','needs_review'));

UPDATE public.entries
  SET source = 'manual', status = 'confirmed', currency = 'SGD', updated_at = created_at;

CREATE INDEX entries_account_id_idx ON public.entries(account_id);
CREATE UNIQUE INDEX entries_external_id_idx ON public.entries(user_id, external_transaction_id) WHERE external_transaction_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_entries_updated_at BEFORE UPDATE ON public.entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();