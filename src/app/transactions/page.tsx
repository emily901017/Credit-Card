import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import ComingSoon from "@/components/ComingSoon";
import { createClient } from "@/lib/supabase/server";

export default async function TransactionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <AppShell title="交易紀錄">
      <ComingSoon step="Step 9（交易與回饋池）" />
    </AppShell>
  );
}
