import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import CardsManager from "@/components/CardsManager";
import { createClient } from "@/lib/supabase/server";
import { getCards, getUserCards } from "@/lib/db/queries";

export default async function CardsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [cards, userCards] = await Promise.all([
    getCards(supabase),
    getUserCards(supabase, user.id),
  ]);

  return (
    <AppShell title="我的卡片">
      <CardsManager cards={cards} userCards={userCards} />
    </AppShell>
  );
}
