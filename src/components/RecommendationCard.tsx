import type { RecommendationItem } from "@/lib/reward-engine/types";
import { formatCurrency, formatPercent } from "@/lib/utils/format";

// 對應 SDD 8.3 / 12.8 / 15.3：單張推薦結果卡片
export default function RecommendationCard({
  item,
  amount,
}: {
  item: RecommendationItem;
  amount: number;
}) {
  const isBest = item.rank === 1;

  return (
    <div
      className={`rounded-2xl border p-4 ${
        isBest ? "border-black bg-black text-white" : "border-gray-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs opacity-70">
            {isBest ? "建議使用" : `備選 #${item.rank}`}
          </p>
          <p className="text-lg font-bold">{item.cardDisplayName}</p>
          <p className="text-xs opacity-70">{item.rewardRuleName}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-extrabold">
            {formatCurrency(item.estimatedRewardAmount)}
          </p>
          <p className="text-xs opacity-70">
            預估回饋率 {formatPercent(item.estimatedRewardRate)}
          </p>
        </div>
      </div>

      <dl
        className={`mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm ${
          isBest ? "text-white/90" : "text-gray-600"
        }`}
      >
        <div>
          <dt className="text-xs opacity-70">有效回饋率</dt>
          <dd>{formatPercent(item.effectiveRewardRate)}</dd>
        </div>
        <div>
          <dt className="text-xs opacity-70">本筆可吃高回饋</dt>
          <dd>{formatCurrency(item.eligibleSpendApplied)}</dd>
        </div>
        {item.excessSpend > 0 && (
          <div>
            <dt className="text-xs opacity-70">超額金額</dt>
            <dd>{formatCurrency(item.excessSpend)}</dd>
          </div>
        )}
        {item.remainingBefore !== null && (
          <div>
            <dt className="text-xs opacity-70">交易前剩餘額度</dt>
            <dd>{formatCurrency(item.remainingBefore)}</dd>
          </div>
        )}
        {item.remainingAfter !== null && (
          <div>
            <dt className="text-xs opacity-70">交易後剩餘額度</dt>
            <dd>{formatCurrency(item.remainingAfter)}</dd>
          </div>
        )}
        <div>
          <dt className="text-xs opacity-70">本次金額</dt>
          <dd>{formatCurrency(amount)}</dd>
        </div>
      </dl>

      {item.notes.length > 0 && (
        <ul
          className={`mt-3 space-y-1 rounded-lg p-2.5 text-xs ${
            isBest ? "bg-white/10" : "bg-amber-50 text-amber-800"
          }`}
        >
          {item.notes.map((note, i) => (
            <li key={i}>• {note}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
