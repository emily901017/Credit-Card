"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createTransaction, voidTransaction } from "@/lib/db/transactions";

// 手動新增交易（SDD 8.6）：會匹配回饋規則並更新回饋池。
export async function createManualTransactionAction(input: {
  merchantId: string;
  userCardId: string;
  amount: number;
  paymentMethod?: string | null;
  transactionDate: string;
  notes?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "尚未登入" };

  if (!input.merchantId) return { ok: false, error: "請選擇商家" };
  if (!input.userCardId) return { ok: false, error: "請選擇卡片" };
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
      notes: input.notes ?? null,
    });
    revalidatePath("/transactions");
    revalidatePath("/reward-pools");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "新增失敗" };
  }
}

// 作廢交易（SDD 8.x / 17.4）：作廢後重算回饋池。
export async function voidTransactionAction(input: {
  transactionId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "尚未登入" };

  try {
    await voidTransaction(supabase, user.id, input.transactionId);
    revalidatePath("/transactions");
    revalidatePath("/reward-pools");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "作廢失敗" };
  }
}
