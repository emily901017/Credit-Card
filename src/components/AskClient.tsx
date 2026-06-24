"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  completeNowAction,
  recommendAction,
  trackPendingAction,
  type RecommendActionResult,
} from "@/app/ask/actions";
import RecommendationCard from "./RecommendationCard";
import type { Merchant } from "@/types/database";
import { todayISO } from "@/lib/utils/format";

const PAYMENT_METHODS = [
  "",
  "實體刷卡",
  "Apple Pay",
  "Google Pay",
  "LINE Pay",
  "街口支付",
];

export default function AskClient({
  merchants,
  hasActiveCard,
}: {
  merchants: Merchant[];
  hasActiveCard: boolean;
}) {
  const [merchantQuery, setMerchantQuery] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [transactionDate, setTransactionDate] = useState(todayISO());

  const [result, setResult] = useState<RecommendActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [actionPending, startActionTransition] = useTransition();
  const [done, setDone] = useState<null | { kind: "tracked" | "completed" }>(
    null,
  );
  const [actionError, setActionError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(amount);
    setDone(null);
    setActionError(null);
    startTransition(async () => {
      const res = await recommendAction({
        merchantQuery,
        amount: amt,
        paymentMethod: paymentMethod || undefined,
        transactionDate,
      });
      setResult(res);
    });
  }

  function handleTrack() {
    if (!result?.ok) return;
    const best = result.result.recommendations[0];
    setActionError(null);
    startActionTransition(async () => {
      const res = await trackPendingAction({
        merchantId: result.merchantId,
        recommendationId: result.recommendationId,
        amount: result.result.amount,
        paymentMethod: result.result.paymentMethod,
        userCardId: best.userCardId,
        rewardRuleId: best.rewardRuleId,
        snapshot: result.result,
      });
      if (res.ok) setDone({ kind: "tracked" });
      else setActionError(res.error ?? "追蹤失敗");
    });
  }

  function handleCompleteNow() {
    if (!result?.ok) return;
    const best = result.result.recommendations[0];
    setActionError(null);
    startActionTransition(async () => {
      const res = await completeNowAction({
        merchantId: result.merchantId,
        amount: result.result.amount,
        paymentMethod: result.result.paymentMethod,
        transactionDate: result.result.transactionDate,
        userCardId: best.userCardId,
      });
      if (res.ok) setDone({ kind: "completed" });
      else setActionError(res.error ?? "記錄失敗");
    });
  }

  function reset() {
    setResult(null);
    setDone(null);
    setActionError(null);
  }

  if (!hasActiveCard) {
    return (
      <div className="rounded-xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-600">
        <p>你尚未新增持有的信用卡。</p>
        <p className="mt-1">請先新增卡片，系統才能根據你的卡片推薦。</p>
        <Link
          href="/cards"
          className="mt-4 inline-block rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white"
        >
          前往新增卡片
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="merchant">
            商家
          </label>
          <input
            id="merchant"
            list="merchant-list"
            value={merchantQuery}
            onChange={(e) => setMerchantQuery(e.target.value)}
            required
            placeholder="例如：momo、全聯、Costco"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-black focus:outline-none"
          />
          <datalist id="merchant-list">
            {merchants.map((m) => (
              <option key={m.id} value={m.display_name} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="amount">
            金額
          </label>
          <input
            id="amount"
            type="number"
            inputMode="numeric"
            min={1}
            max={10000000}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            placeholder="8000"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-black focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="payment">
              支付方式
            </label>
            <select
              id="payment"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-black focus:outline-none"
            >
              {PAYMENT_METHODS.map((pm) => (
                <option key={pm} value={pm}>
                  {pm || "不指定"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="date">
              交易日期
            </label>
            <input
              id="date"
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-black focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-black py-3 text-base font-semibold text-white disabled:opacity-50"
        >
          {pending ? "計算中…" : "幫我看刷哪張"}
        </button>
      </form>

      {result && !result.ok && (
        <div className="space-y-2 rounded-xl bg-amber-50 px-4 py-4 text-sm text-amber-800">
          <p>{result.error}</p>
          {result.code === "no_cards" && (
            <Link
              href="/cards"
              className="inline-block rounded-lg bg-black px-4 py-2 text-xs font-semibold text-white"
            >
              前往我的卡片
            </Link>
          )}
        </div>
      )}

      {result && result.ok && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-500">
            {result.result.merchant.displayName}・推薦結果
          </h2>
          {result.result.recommendations.map((item) => (
            <RecommendationCard
              key={item.userCardId}
              item={item}
              amount={result.result.amount}
            />
          ))}

          {actionError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {actionError}
            </p>
          )}

          {done ? (
            <div className="space-y-3 rounded-xl bg-green-50 px-4 py-4 text-sm text-green-800">
              <p>
                {done.kind === "tracked"
                  ? "已追蹤這筆消費，稍後可在「待確認」確認結果。"
                  : "已記錄交易並更新回饋額度，幫你下次推薦更準。"}
              </p>
              <div className="flex gap-2">
                <Link
                  href={done.kind === "tracked" ? "/pending" : "/transactions"}
                  className="rounded-lg bg-black px-4 py-2 text-xs font-semibold text-white"
                >
                  {done.kind === "tracked" ? "前往待確認" : "查看交易"}
                </Link>
                <button
                  onClick={reset}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700"
                >
                  再問一筆
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="pt-1 text-center text-sm text-gray-500">
                要幫你追蹤這筆嗎？
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={handleTrack}
                  disabled={actionPending}
                  className="rounded-lg bg-black py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  追蹤這筆
                </button>
                <button
                  onClick={handleCompleteNow}
                  disabled={actionPending}
                  className="rounded-lg border border-black py-2.5 text-sm font-semibold disabled:opacity-50"
                >
                  我已刷完
                </button>
                <button
                  onClick={reset}
                  disabled={actionPending}
                  className="rounded-lg border border-gray-300 py-2.5 text-sm font-medium disabled:opacity-50"
                >
                  只是查詢
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
