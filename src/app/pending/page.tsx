import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import PendingList from "@/components/PendingList";
import { createClient } from "@/lib/supabase/server";
import { getUserCards } from "@/lib/db/queries";
import { getPendingTransactions } from "@/lib/db/transactions";

export const dynamic = "force-dynamic";

export default async function PendingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [pendings, userCards] = await Promise.all([
    getPendingTransactions(supabase, user.id),
    getUserCards(supabase, user.id),
  ]);
  const activeCards = userCards.filter((uc) => uc.is_active !== false);

  return (
    <AppShell title="待確認交易">
      <PendingList pendings={pendings} userCards={activeCards} />
    </AppShell>
  );
}
