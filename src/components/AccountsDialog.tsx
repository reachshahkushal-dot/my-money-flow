import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ACCOUNT_TYPE_LABELS, type Account, type AccountType } from "@/lib/finance";

export function AccountsDialog({
  userId,
  accounts,
  trigger,
}: {
  userId: string;
  accounts: Account[];
  trigger: React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [type, setType] = useState<AccountType>("bank");
  const [currency, setCurrency] = useState("SGD");
  const [opening, setOpening] = useState("");
  const [error, setError] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["accounts", userId] });

  const create = useMutation({
    mutationFn: async () => {
      const { error: e } = await supabase.from("accounts").insert({
        user_id: userId,
        account_name: name.trim(),
        institution: institution.trim() || null,
        account_type: type,
        currency: currency.trim().toUpperCase() || "SGD",
        opening_balance: Number(opening) || 0,
      });
      if (e) throw e;
    },
    onSuccess: () => {
      setName("");
      setInstitution("");
      setOpening("");
      setError(null);
      invalidate();
    },
    onError: (e: Error) => setError(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async (a: Account) => {
      const { error: e } = await supabase
        .from("accounts")
        .update({ is_active: !a.is_active })
        .eq("id", a.id);
      if (e) throw e;
    },
    onSuccess: invalidate,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Accounts</DialogTitle>
        </DialogHeader>

        {accounts.length > 0 && (
          <ul className="divide-y divide-border rounded-md border border-border">
            {accounts.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.account_name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[a.institution, ACCOUNT_TYPE_LABELS[a.account_type], a.currency]
                      .filter(Boolean)
                      .join(" · ")}
                    {a.is_active ? "" : " · inactive"}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => toggleActive.mutate(a)}>
                  {a.is_active ? "Deactivate" : "Activate"}
                </Button>
              </li>
            ))}
          </ul>
        )}

        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) {
              setError("Give the account a name.");
              return;
            }
            create.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="acc-name">Account name</Label>
            <Input
              id="acc-name"
              placeholder="DBS Current"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="acc-inst">Institution</Label>
              <Input
                id="acc-inst"
                placeholder="DBS"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as AccountType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {ACCOUNT_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="acc-cur">Currency</Label>
              <Input id="acc-cur" value={currency} onChange={(e) => setCurrency(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="acc-open">Opening balance</Label>
              <Input
                id="acc-open"
                inputMode="decimal"
                placeholder="0.00"
                value={opening}
                onChange={(e) => setOpening(e.target.value)}
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={create.isPending}>
            Add account
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
