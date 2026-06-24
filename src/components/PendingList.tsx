"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  cancelPendingAction,
  confirmPendingAction,
} from "@/app/pending/actions";
import type { PendingWithRelations } from "@/lib/db/transactions";
import type { UserCardWithCard } from "@/lib/db/queries";
import { formatCurrency, todayISO } from "@/lib/utils/format";

function PendingItem({
  pending,
  userCards,
}: {
  pending: PendingWithRelations;
  userCards: UserCardWithCard[];
}) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [userCardId, setUserCardId] = useState(
    pending.recommended_user_card_id ?? userCards[0]?.id ?? "",
  );
  const [amount, setAmount] = useState(String(pending.estimated_amount));
  const [date, setDate] = useState(todayISO());

  function confirm() {
    setError(null);
    startTransition(async () => {
      const res = await confirmPendingAction({
        pendingId: pending.id,
        merchantId: pending.merchant_id,
        userCardId,
        amount: Number(amount),
        paymentMethod: pending.payment_method,
        transactionDate: date,
      });
      if (res.ok) router.refresh();
      else setError(res.error ?? "確認失敗");
    });
  }

  function cancel() {
    setError(null);
    startTransition(async () => {
      const res = await cancelPendingAction({ pendingId: pending.id });
      if (res.ok) router.refresh();
      else setError(res.error ?? "操作失敗");
    });
  }

  const recommendedName = pending.recommended_user_card?.card?.display_name;

  return (
    <li className="space-y-3 rounded-xl border border-gray-200 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold">{pending.merchant?.display_name}</p>
          <p className="text-sm text-gray-500">
            預估 {formatCurrency(pending.estimated_amount)}
            {recommendedName ? ` · 推薦：${recommendedName}` : ""}
          </p>
          <p className="text-xs text-gray-400">
            {new Date(pending.created_at).toLocaleString("zh-TW")}
          </p>
        </div>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
          待確認
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="col-span-2 text-xs text-gray-500">
          實際使用卡片
          <select
            value={userCardId}
            onChange={(e) => setUserCardId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-2 text-sm text-black focus:border-black focus:outline-none"
          >
            {userCards.map((uc) => (
              <option key={uc.id} value={uc.id}>
                {uc.card?.display_name}
                {uc.nickname ? `（${uc.nickname}）` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-gray-500">
          實際金額
          <input
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-2 text-sm text-black focus:border-black focus:outline-none"
          />
        </label>
        <label className="text-xs text-gray-500">
          交易日期
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-2 text-sm text-black focus:border-black focus:outline-none"
          />
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={confirm}
          disabled={busy || !userCardId}
          className="rounded-lg bg-black py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          確認完成
        </button>
        <button
          onClick={cancel}
          disabled={busy}
          className="rounded-lg border border-gray-300 py-2.5 text-sm font-medium disabled:opacity-50"
        >
          沒有交易
        </button>
      </div>
    </li>
  );
}

export default function PendingList({
  pendings,
  userCards,
}: {
  pendings: PendingWithRelations[];
  userCards: UserCardWithCard[];
}) {
  if (pendings.length === 0) {
    return (
      <p className="rounded-xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
        目前沒有待確認的交易。到「詢問」推薦後點「追蹤這筆」就會出現在這裡。
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {pendings.map((p) => (
        <PendingItem key={p.id} pending={p} userCards={userCards} />
      ))}
    </ul>
  );
}
