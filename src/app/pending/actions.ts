"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  cancelPendingTransaction,
  createTransaction,
} from "@/lib/db/transactions";

// 確認待確認交易（SDD 8.5）：依實際選擇的卡片與金額建立 confirmed transaction。
// 涵蓋「使用推薦卡 / 改用其他卡 / 修改金額」三種情境。
export async function confirmPendingAction(input: {
  pendingId: string;
  merchantId: string;
  userCardId: string;
  amount: number;
  paymentMethod?: string | null;
  transactionDate: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "尚未登入" };

  if (!(input.amount > 0) || input.amount > 10_000_000) {
    return { ok: false, error: "金額須大於 0 且不超過 10,000,000" };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.transactionDate)) {
    return { ok: false, error: "交易日期格式不正確" };
  }

  try {
    await createTransaction(supabase, user.id, {
      merchantId: input.merchantId,
      userCardId: input.userCardId,
      amount: input.amount,
      paymentMethod: input.paymentMethod ?? null,
      transactionDate: input.transactionDate,
      pendingTransactionId: input.pendingId,
    });
    revalidatePath("/pending");
    revalidatePath("/transactions");
    revalidatePath("/reward-pools");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "確認失敗" };
  }
}

// 沒有交易（SDD 8.5）：pending 狀態改為 cancelled。
export async function cancelPendingAction(input: {
  pendingId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "尚未登入" };

  try {
    await cancelPendingTransaction(supabase, input.pendingId);
    revalidatePath("/pending");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "操作失敗" };
  }
}
