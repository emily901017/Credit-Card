"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { recommendAction, type RecommendActionResult } from "@/app/ask/actions";
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(amount);
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

          {/* 動作按鈕：完整的追蹤 / 已刷完流程於 Step 8（待確認交易）實作 */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            <button
              disabled
              title="待確認交易功能將於下一步加入"
              className="rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-400"
            >
              追蹤這筆
            </button>
            <button
              disabled
              title="待確認交易功能將於下一步加入"
              className="rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-400"
            >
              我已刷完
            </button>
            <button
              onClick={() => setResult(null)}
              className="rounded-lg border border-gray-300 py-2.5 text-sm font-medium"
            >
              只是查詢
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
