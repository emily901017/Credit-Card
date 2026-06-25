import type { RewardPoolView } from "@/lib/db/transactions";
import { formatCurrency, formatPercent } from "@/lib/utils/format";

// 對應 SDD 8.7 / 14.6：單一回饋池進度卡
export default function RewardPoolProgress({ pool }: { pool: RewardPoolView }) {
  const hasCap = pool.eligibleSpendCap !== null;
  const pct = hasCap
    ? Math.min(
        100,
        Math.round((pool.usedEligibleSpend / pool.eligibleSpendCap!) * 100),
      )
    : null;
  const isCapped = hasCap && (pool.remaining ?? 0) <= 0;

  const reminders: string[] = [];
  if (pool.requiresRegistration) reminders.push("需登錄");
  if (pool.requiresBenefitSwitch) reminders.push("需切權益");
  if (pool.requiresCoupon) reminders.push("需領券");

  return (
    <div className="rounded-2xl border border-gray-200 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold">{pool.cardDisplayName}</p>
          <p className="text-sm text-gray-500">{pool.ruleName}</p>
        </div>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
          {formatPercent(pool.rewardRate)}
        </span>
      </div>

      <p className="mt-1 text-xs text-gray-400">
        期間 {pool.periodStart} ~ {pool.periodEnd}
      </p>

      {hasCap ? (
        <>
          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full ${
                isCapped ? "bg-red-500" : "bg-black"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-sm">
            <span className="text-gray-600">
              已刷 {formatCurrency(pool.usedEligibleSpend)} /{" "}
              {formatCurrency(pool.eligibleSpendCap!)}
            </span>
            <span className={isCapped ? "text-red-500" : "text-gray-600"}>
              {isCapped
                ? "已封頂"
                : `剩 ${formatCurrency(pool.remaining ?? 0)}`}
            </span>
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm text-gray-600">
          無上限 · 已刷 {formatCurrency(pool.usedEligibleSpend)}
        </p>
      )}

      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
        <span>已累積回饋 {formatCurrency(pool.earnedRewardAmount)}</span>
        <span>{pool.transactionCount} 筆</span>
      </div>

      {reminders.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {reminders.map((r) => (
            <span
              key={r}
              className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700"
            >
              {r}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
