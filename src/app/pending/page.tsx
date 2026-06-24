import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import ComingSoon from "@/components/ComingSoon";
import { createClient } from "@/lib/supabase/server";

export default async function PendingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <AppShell title="待確認交易">
      <ComingSoon step="Step 8（待確認交易）" />
    </AppShell>
  );
}
