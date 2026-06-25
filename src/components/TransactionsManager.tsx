"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createManualTransactionAction,
  voidTransactionAction,
} from "@/app/transactions/actions";
import type { TransactionWithRelations } from "@/lib/db/transactions";
import type { UserCardWithCard } from "@/lib/db/queries";
import type { Merchant } from "@/types/database";
import { formatCurrency, todayISO } from "@/lib/utils/format";

const PAYMENT_METHODS = [
  "",
  "實體刷卡",
  "Apple Pay",
  "Google Pay",
  "LINE Pay",
  "街口支付",
];

export default function TransactionsManager({
  transactions,
  merchants,
  userCards,
}: {
  transactions: TransactionWithRelations[];
  merchants: Merchant[];
  userCards: UserCardWithCard[];
}) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [merchantId, setMerchantId] = useState("");
  const [userCardId, setUserCardId] = useState(userCards[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState("");

  function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createManualTransactionAction({
        merchantId,
        userCardId,
        amount: Number(amount),
        paymentMethod: paymentMethod || null,
        transactionDate: date,
        notes: notes || null,
      });
      if (res.ok) {
        setShowAdd(false);
        setMerchantId("");
        setAmount("");
        setNotes("");
        router.refresh();
      } else {
        setError(res.error ?? "新增失敗");
      }
    });
  }

  function voidTx(id: string) {
    startTransition(async () => {
      const res = await voidTransactionAction({ transactionId: id });
      if (res.ok) router.refresh();
      else setError(res.error ?? "作廢失敗");
    });
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => setShowAdd((v) => !v)}
        disabled={userCards.length === 0}
        className="w-full rounded-lg bg-black py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {showAdd ? "取消" : "+ 手動新增交易"}
      </button>

      {userCards.length === 0 && (
        <p className="text-center text-xs text-gray-400">
          請先到「我的卡片」新增卡片才能記錄交易。
        </p>
      )}

      {showAdd && (
        <form
          onSubmit={add}
          className="space-y-3 rounded-xl border border-gray-200 p-4"
        >
          <label className="block text-xs text-gray-500">
            商家
            <select
              value={merchantId}
              onChange={(e) => setMerchantId(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-2 text-sm text-black focus:border-black focus:outline-none"
            >
              <option value="">請選擇…</option>
              {merchants.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.display_name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-gray-500">
            卡片
            <select
              value={userCardId}
              onChange={(e) => setUserCardId(e.target.value)}
              required
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
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs text-gray-500">
              金額
              <input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-2 text-sm text-black focus:border-black focus:outline-none"
              />
            </label>
            <label className="block text-xs text-gray-500">
              交易日期
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-2 text-sm text-black focus:border-black focus:outline-none"
              />
            </label>
          </div>
          <label className="block text-xs text-gray-500">
            支付方式
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-2 text-sm text-black focus:border-black focus:outline-none"
            >
              {PAYMENT_METHODS.map((pm) => (
                <option key={pm} value={pm}>
                  {pm || "不指定"}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-gray-500">
            備註（可選）
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-2 text-sm text-black focus:border-black focus:outline-none"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-black py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "處理中…" : "新增交易"}
          </button>
        </form>
      )}

      {transactions.length === 0 ? (
        <p className="rounded-xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
          還沒有交易紀錄。
        </p>
      ) : (
        <ul className="space-y-3">
          {transactions.map((tx) => {
            const voided = tx.status === "voided";
            return (
              <li
                key={tx.id}
                className={`rounded-xl border p-4 ${
                  voided
                    ? "border-gray-200 bg-gray-50 opacity-60"
                    : "border-gray-200"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">
                      {tx.merchant?.display_name}
                      {voided && (
                        <span className="ml-2 text-xs text-red-500">已作廢</span>
                      )}
                    </p>
                    <p className="text-sm text-gray-500">
                      {tx.transaction_date} · {tx.user_card?.card?.display_name}
                    </p>
                    {tx.notes && (
                      <p className="text-xs text-gray-400">{tx.notes}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(tx.amount)}</p>
                    <p className="text-xs text-green-600">
                      回饋 {formatCurrency(tx.estimated_reward_amount)}
                    </p>
                  </div>
                </div>
                {!voided && (
                  <button
                    onClick={() => voidTx(tx.id)}
                    disabled={busy}
                    className="mt-2 text-xs text-gray-400 underline disabled:opacity-50"
                  >
                    作廢這筆
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
