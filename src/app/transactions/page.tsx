import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import TransactionsManager from "@/components/TransactionsManager";
import { createClient } from "@/lib/supabase/server";
import { getMerchants, getUserCards } from "@/lib/db/queries";
import { getTransactions } from "@/lib/db/transactions";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [transactions, merchants, userCards] = await Promise.all([
    getTransactions(supabase, user.id),
    getMerchants(supabase),
    getUserCards(supabase, user.id),
  ]);
  const activeCards = userCards.filter((uc) => uc.is_active !== false);

  return (
    <AppShell title="交易紀錄">
      <TransactionsManager
        transactions={transactions}
        merchants={merchants}
        userCards={activeCards}
      />
    </AppShell>
  );
}
