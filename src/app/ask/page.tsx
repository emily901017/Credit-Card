import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import AskClient from "@/components/AskClient";
import { createClient } from "@/lib/supabase/server";
import { getMerchants, getUserCards } from "@/lib/db/queries";

export default async function AskPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [merchants, userCards] = await Promise.all([
    getMerchants(supabase),
    getUserCards(supabase, user.id),
  ]);

  const hasActiveCard = userCards.some((uc) => uc.is_active !== false);

  return (
    <AppShell title="刷哪張？">
      <AskClient merchants={merchants} hasActiveCard={hasActiveCard} />
    </AppShell>
  );
}
