"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  addUserCard,
  deactivateUserCard,
  reactivateUserCard,
  type UserCardWithCard,
} from "@/lib/db/queries";
import type { Card } from "@/types/database";

export default function CardsManager({
  cards,
  userCards,
}: {
  cards: Card[];
  userCards: UserCardWithCard[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [showAdd, setShowAdd] = useState(false);
  const [cardId, setCardId] = useState("");
  const [nickname, setNickname] = useState("");
  const [last4, setLast4] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!cardId) return;
    setBusy(true);
    setError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("尚未登入");
      await addUserCard(supabase, user.id, cardId, nickname, last4);
      setShowAdd(false);
      setCardId("");
      setNickname("");
      setLast4("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "新增失敗");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(uc: UserCardWithCard) {
    setBusy(true);
    try {
      if (uc.is_active === false) {
        await reactivateUserCard(supabase, uc.id);
      } else {
        await deactivateUserCard(supabase, uc.id);
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => setShowAdd((v) => !v)}
        className="w-full rounded-lg bg-black py-3 text-sm font-semibold text-white"
      >
        {showAdd ? "取消" : "+ 新增持有卡片"}
      </button>

      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="space-y-3 rounded-xl border border-gray-200 p-4"
        >
          <div>
            <label className="mb-1 block text-sm font-medium">選擇卡片</label>
            <select
              value={cardId}
              onChange={(e) => setCardId(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-black focus:outline-none"
            >
              <option value="">請選擇…</option>
              {cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.display_name}（{c.issuer}）
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              暱稱（可選）
            </label>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="例如：網購卡"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-black focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              末四碼（可選）
            </label>
            <input
              value={last4}
              onChange={(e) =>
                setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))
              }
              inputMode="numeric"
              placeholder="1234"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-black focus:outline-none"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-black py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "處理中…" : "新增到我的卡片"}
          </button>
        </form>
      )}

      {userCards.length === 0 ? (
        <p className="rounded-xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
          你尚未新增持有的信用卡。請先新增卡片，系統才能根據你的卡片推薦。
        </p>
      ) : (
        <ul className="space-y-3">
          {userCards.map((uc) => (
            <li
              key={uc.id}
              className={`rounded-xl border p-4 ${
                uc.is_active === false
                  ? "border-gray-200 bg-gray-50 opacity-60"
                  : "border-gray-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{uc.card?.display_name}</p>
                  <p className="text-sm text-gray-500">
                    {uc.card?.issuer}
                    {uc.nickname ? ` · ${uc.nickname}` : ""}
                    {uc.last4 ? ` · ****${uc.last4}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => toggleActive(uc)}
                  disabled={busy}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                >
                  {uc.is_active === false ? "啟用" : "停用"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
