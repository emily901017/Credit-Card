import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import RewardPoolProgress from "@/components/RewardPoolProgress";
import { createClient } from "@/lib/supabase/server";
import { getRewardPools } from "@/lib/db/transactions";

export const dynamic = "force-dynamic";

export default async function RewardPoolsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const pools = await getRewardPools(supabase, user.id);

  return (
    <AppShell title="回饋池額度">
      {pools.length === 0 ? (
        <p className="rounded-xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
          目前還沒有回饋池紀錄。確認交易後，這裡會顯示每張卡本月高回饋額度的使用情況。
        </p>
      ) : (
        <div className="space-y-3">
          {pools.map((pool) => (
            <RewardPoolProgress key={pool.id} pool={pool} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
