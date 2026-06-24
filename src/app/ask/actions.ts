"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createRecommendation,
  getRecommendation,
  resolveMerchant,
} from "@/lib/db/queries";
import {
  createPendingTransaction,
  createTransaction,
} from "@/lib/db/transactions";
import type { RecommendationResult } from "@/lib/reward-engine/types";

export type RecommendActionResult =
  | {
      ok: true;
      recommendationId: string;
      merchantId: string;
      result: RecommendationResult;
    }
  | { ok: false; error: string; code?: "no_merchant" | "no_cards" | "invalid" };

// 對應 SDD 8.3 / 12 / 17.2 / 19.3：執行推薦並儲存快照。
export async function recommendAction(input: {
  merchantQuery: string;
  amount: number;
  paymentMethod?: string;
  transactionDate: string;
}): Promise<RecommendActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "尚未登入", code: "invalid" };

  // 輸入驗證（SDD 19.3）
  if (!(input.amount > 0) || input.amount > 10_000_000) {
    return { ok: false, error: "金額須大於 0 且不超過 10,000,000", code: "invalid" };
  }
  if (!input.merchantQuery.trim()) {
    return { ok: false, error: "請輸入商家", code: "invalid" };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.transactionDate)) {
    return { ok: false, error: "交易日期格式不正確", code: "invalid" };
  }

  // 商家解析（SDD 18.3）
  const merchant = await resolveMerchant(supabase, input.merchantQuery);
  if (!merchant) {
    return {
      ok: false,
      error: "找不到這個商家。你可以改用消費類別來估算。",
      code: "no_merchant",
    };
  }

  const recInput = {
    userId: user.id,
    merchantId: merchant.id,
    amount: input.amount,
    paymentMethod: input.paymentMethod || null,
    transactionDate: input.transactionDate,
  };

  const result = await getRecommendation(supabase, recInput);

  if (result.recommendations.length === 0) {
    return {
      ok: false,
      error:
        "目前沒有找到可用的回饋規則。請先到「我的卡片」新增持有卡片，或改用其他卡。",
      code: "no_cards",
    };
  }

  // 儲存推薦快照（SDD 17.2）
  const recommendationId = await createRecommendation(
    supabase,
    user.id,
    recInput,
    result,
  );

  return {
    ok: true,
    recommendationId,
    merchantId: merchant.id,
    result,
  };
}

// 追蹤這筆（SDD 8.4）：建立 pending transaction，不影響回饋池（17.1）
export async function trackPendingAction(input: {
  merchantId: string;
  recommendationId: string;
  amount: number;
  paymentMethod?: string | null;
  userCardId: string;
  rewardRuleId: string;
  snapshot: RecommendationResult;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "尚未登入" };

  try {
    await createPendingTransaction(supabase, user.id, {
      merchantId: input.merchantId,
      estimatedAmount: input.amount,
      recommendedUserCardId: input.userCardId,
      recommendedRewardRuleId: input.rewardRuleId,
      paymentMethod: input.paymentMethod ?? null,
      recommendationId: input.recommendationId,
      recommendationSnapshot: input.snapshot,
    });
    revalidatePath("/pending");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "追蹤失敗" };
  }
}

// 我已刷完（SDD 8.4）：直接建立 confirmed transaction 並更新回饋池
export async function completeNowAction(input: {
  merchantId: string;
  amount: number;
  paymentMethod?: string | null;
  transactionDate: string;
  userCardId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "尚未登入" };

  try {
    await createTransaction(supabase, user.id, {
      merchantId: input.merchantId,
      userCardId: input.userCardId,
      amount: input.amount,
      paymentMethod: input.paymentMethod ?? null,
      transactionDate: input.transactionDate,
    });
    revalidatePath("/transactions");
    revalidatePath("/reward-pools");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "記錄失敗" };
  }
}
