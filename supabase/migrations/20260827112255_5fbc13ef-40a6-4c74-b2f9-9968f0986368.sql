ALTER TABLE public.entries ADD COLUMN IF NOT EXISTS my_share numeric;

CREATE TABLE public.debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_name text NOT NULL,
  direction text NOT NULL DEFAULT 'owes_me',
  amount numeric NOT NULL DEFAULT 0,
  remaining_amount numeric NOT NULL DEFAULT 0,
  original_transaction_id uuid REFERENCES public.entries(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'outstanding',
  date date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT debts_direction_check CHECK (direction IN ('owes_me','i_owe')),
  CONSTRAINT debts_status_check CHECK (status IN ('outstanding','partially_settled','settled','bad_debt'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.debts TO authenticated;
GRANT ALL ON public.debts TO service_role;

ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own debts" ON public.debts
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX debts_user_status_idx ON public.debts (user_id, status);
CREATE INDEX debts_transaction_idx ON public.debts (original_transaction_id);

CREATE TRIGGER update_debts_updated_at
  BEFORE UPDATE ON public.debts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();