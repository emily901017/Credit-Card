import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Card,
  Merchant,
  PendingTransaction,
  RewardRule,
  Transaction,
  UserCard,
} from "@/types/database";
import { calculateReward } from "@/lib/reward-engine/calculateReward";
import { matchBestRule } from "@/lib/reward-engine/matchRewardRule";
import { computePeriod } from "@/lib/reward-engine/period";
import type {
  EngineMerchant,
  EngineRewardRule,
  RecommendationResult,
} from "@/lib/reward-engine/types";
import { toEngineRule } from "./queries";

// =========================================================
// Pending transactions（SDD 8.4 / 8.5 / 17.1）
// =========================================================

export type CreatePendingInput = {
  merchantId: string;
  estimatedAmount: number;
  recommendedUserCardId: string | null;
  recommendedRewardRuleId: string | null;
  paymentMethod: string | null;
  recommendationId: string | null;
  recommendationSnapshot: RecommendationResult;
};

export async function createPendingTransaction(
  supabase: SupabaseClient,
  userId: string,
  input: CreatePendingInput,
): Promise<string> {
  const { data, error } = await supabase
    .from("pending_transactions")
    .insert({
      user_id: userId,
      merchant_id: input.merchantId,
      estimated_amount: input.estimatedAmount,
      recommended_user_card_id: input.recommendedUserCardId,
      recommended_reward_rule_id: input.recommendedRewardRuleId,
      payment_method: input.paymentMethod,
      recommendation_id: input.recommendationId,
      recommendation_snapshot: input.recommendationSnapshot,
      status: "pending",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export type PendingWithRelations = PendingTransaction & {
  merchant: Pick<Merchant, "id" | "display_name" | "category"> | null;
  recommended_user_card:
    | (Pick<UserCard, "id" | "nickname"> & {
        card: Pick<Card, "display_name"> | null;
      })
    | null;
};

export async function getPendingTransactions(
  supabase: SupabaseClient,
  userId: string,
): Promise<PendingWithRelations[]> {
  const { data, error } = await supabase
    .from("pending_transactions")
    .select(
      "*, merchant:merchants(id, display_name, category), recommended_user_card:user_cards!pending_transactions_recommended_user_card_id_fkey(id, nickname, card:cards(display_name))",
    )
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as PendingWithRelations[];
}

export async function cancelPendingTransaction(
  supabase: SupabaseClient,
  pendingId: string,
): Promise<void> {
  const { error } = await supabase
    .from("pending_transactions")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", pendingId);
  if (error) throw error;
}

// =========================================================
// Confirmed transactions（SDD 8.5 / 8.6 / 17.3）
// =========================================================

export type CreateTransactionInput = {
  merchantId: string;
  userCardId: string;
  amount: number;
  paymentMethod: string | null;
  transactionDate: string;
  pendingTransactionId?: string | null;
  notes?: string | null;
};

// 建立已確認交易，並重算回饋池（SDD 17.3：依實際資料重新計算）。
export async function createTransaction(
  supabase: SupabaseClient,
  userId: string,
  input: CreateTransactionInput,
): Promise<string> {
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      user_id: userId,
      pending_transaction_id: input.pendingTransactionId ?? null,
      merchant_id: input.merchantId,
      user_card_id: input.userCardId,
      transaction_date: input.transactionDate,
      amount: input.amount,
      payment_method: input.paymentMethod,
      status: "confirmed",
      notes: input.notes ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;

  // 標記來源 pending 為已完成（SDD 8.5）
  if (input.pendingTransactionId) {
    await supabase
      .from("pending_transactions")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", input.pendingTransactionId);
  }

  await recalculateRewardPools(supabase, userId);
  return data.id as string;
}

export type TransactionWithRelations = Transaction & {
  merchant: Pick<Merchant, "display_name"> | null;
  user_card:
    | (Pick<UserCard, "nickname"> & { card: Pick<Card, "display_name"> | null })
    | null;
};

export async function getTransactions(
  supabase: SupabaseClient,
  userId: string,
): Promise<TransactionWithRelations[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select(
      "*, merchant:merchants(display_name), user_card:user_cards(nickname, card:cards(display_name))",
    )
    .eq("user_id", userId)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as TransactionWithRelations[];
}

// 作廢交易並重算（SDD 17.4）
export async function voidTransaction(
  supabase: SupabaseClient,
  userId: string,
  transactionId: string,
): Promise<void> {
  const { error } = await supabase
    .from("transactions")
    .update({ status: "voided", updated_at: new Date().toISOString() })
    .eq("id", transactionId);
  if (error) throw error;
  await recalculateRewardPools(supabase, userId);
}

// =========================================================
// 回饋池重算（SDD 17.4 簡化版：清空後依交易日期重新套用全部 confirmed 交易）
// =========================================================

type PoolAccumulator = {
  rewardRuleId: string;
  userCardId: string;
  periodStart: string;
  periodEnd: string;
  usedEligibleSpend: number;
  earnedRewardAmount: number;
  transactionCount: number;
};

function poolKey(
  ruleId: string,
  userCardId: string,
  periodStart: string,
  periodEnd: string,
): string {
  return `${ruleId}:${userCardId}:${periodStart}:${periodEnd}`;
}

export async function recalculateRewardPools(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  // 1. 全部 confirmed 交易（依日期、建立時間排序）
  const { data: txRows, error: txErr } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "confirmed")
    .order("transaction_date", { ascending: true })
    .order("created_at", { ascending: true });
  if (txErr) throw txErr;
  const transactions = (txRows ?? []) as Transaction[];

  // 2. 清空使用者的回饋池
  const { error: delErr } = await supabase
    .from("reward_pool_usages")
    .delete()
    .eq("user_id", userId);
  if (delErr) throw delErr;

  if (transactions.length === 0) return;

  // 3. 載入相關 user_cards / merchants / reward_rules
  const userCardIds = Array.from(
    new Set(transactions.map((t) => t.user_card_id)),
  );
  const merchantIds = Array.from(new Set(transactions.map((t) => t.merchant_id)));

  const { data: ucRows } = await supabase
    .from("user_cards")
    .select("id, card_id")
    .in("id", userCardIds);
  const userCardToCard = new Map<string, string>();
  for (const uc of ucRows ?? []) userCardToCard.set(uc.id, uc.card_id);

  const cardIds = Array.from(new Set((ucRows ?? []).map((uc) => uc.card_id)));

  const { data: merchantRows } = await supabase
    .from("merchants")
    .select("id, display_name, category")
    .in("id", merchantIds);
  const merchantMap = new Map<string, EngineMerchant>();
  for (const m of merchantRows ?? [])
    merchantMap.set(m.id, {
      id: m.id,
      displayName: m.display_name,
      category: m.category,
    });

  const { data: ruleRows } = await supabase
    .from("reward_rules")
    .select("*")
    .in("card_id", cardIds)
    .eq("is_active", true);
  const rulesByCard = new Map<string, EngineRewardRule[]>();
  for (const r of ruleRows ?? []) {
    const rule = toEngineRule(r as RewardRule);
    const list = rulesByCard.get(rule.cardId) ?? [];
    list.push(rule);
    rulesByCard.set(rule.cardId, list);
  }

  // 4. 依序套用每筆交易
  const pools = new Map<string, PoolAccumulator>();

  for (const tx of transactions) {
    const cardId = userCardToCard.get(tx.user_card_id);
    const merchant = merchantMap.get(tx.merchant_id);
    if (!cardId || !merchant) continue;

    const rules = rulesByCard.get(cardId) ?? [];
    const best = matchBestRule(
      rules,
      merchant,
      tx.payment_method,
      tx.transaction_date,
    );

    if (!best) {
      // 沒有可用規則：清掉該交易的回饋欄位
      await supabase
        .from("transactions")
        .update({
          reward_rule_id: null,
          matched_reward_rate: null,
          eligible_spend_applied: 0,
          estimated_reward_amount: 0,
        })
        .eq("id", tx.id);
      continue;
    }

    const period = computePeriod(best, tx.transaction_date);
    const key = poolKey(
      best.id,
      tx.user_card_id,
      period.periodStart,
      period.periodEnd,
    );
    const acc = pools.get(key);
    const usedBefore = acc?.usedEligibleSpend ?? 0;

    const calc = calculateReward(best, Number(tx.amount), usedBefore);

    // 更新交易列為實際計算結果
    await supabase
      .from("transactions")
      .update({
        reward_rule_id: best.id,
        matched_reward_rate: best.rewardRate,
        eligible_spend_applied: calc.eligibleSpendApplied,
        estimated_reward_amount: calc.totalReward,
      })
      .eq("id", tx.id);

    pools.set(key, {
      rewardRuleId: best.id,
      userCardId: tx.user_card_id,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      usedEligibleSpend: usedBefore + calc.eligibleSpendApplied,
      earnedRewardAmount: (acc?.earnedRewardAmount ?? 0) + calc.totalReward,
      transactionCount: (acc?.transactionCount ?? 0) + 1,
    });
  }

  // 5. 寫回回饋池
  const rows = Array.from(pools.values()).map((p) => ({
    user_id: userId,
    reward_rule_id: p.rewardRuleId,
    user_card_id: p.userCardId,
    period_start: p.periodStart,
    period_end: p.periodEnd,
    used_eligible_spend: p.usedEligibleSpend,
    earned_reward_amount: p.earnedRewardAmount,
    transaction_count: p.transactionCount,
    updated_at: new Date().toISOString(),
  }));

  if (rows.length > 0) {
    const { error: insErr } = await supabase
      .from("reward_pool_usages")
      .insert(rows);
    if (insErr) throw insErr;
  }
}

// =========================================================
// 回饋池儀表板（SDD 8.7 / 14.6）
// =========================================================

export type RewardPoolView = {
  id: string;
  cardDisplayName: string;
  nickname: string | null;
  ruleName: string;
  periodStart: string;
  periodEnd: string;
  usedEligibleSpend: number;
  earnedRewardAmount: number;
  transactionCount: number;
  capType: RewardRule["cap_type"];
  eligibleSpendCap: number | null; // 換算後的可吃高回饋消費上限
  rewardRate: number;
  remaining: number | null;
  requiresRegistration: boolean;
  requiresBenefitSwitch: boolean;
  requiresCoupon: boolean;
};

export async function getRewardPools(
  supabase: SupabaseClient,
  userId: string,
): Promise<RewardPoolView[]> {
  const { data, error } = await supabase
    .from("reward_pool_usages")
    .select(
      "*, reward_rule:reward_rules(*), user_card:user_cards(nickname, card:cards(display_name))",
    )
    .eq("user_id", userId)
    .order("period_start", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((row): RewardPoolView => {
    const rule = row.reward_rule as RewardRule;
    const card = row.user_card as {
      nickname: string | null;
      card: { display_name: string } | null;
    } | null;

    // 換算可吃高回饋消費上限
    let eligibleSpendCap: number | null = null;
    if (rule.cap_type === "eligible_spend") {
      eligibleSpendCap = rule.eligible_spend_cap;
    } else if (rule.cap_type === "reward_amount" && Number(rule.reward_rate) > 0) {
      eligibleSpendCap = Number(rule.cap_value) / Number(rule.reward_rate);
    }

    const used = Number(row.used_eligible_spend);
    const remaining =
      eligibleSpendCap === null ? null : Math.max(eligibleSpendCap - used, 0);

    return {
      id: row.id,
      cardDisplayName: card?.card?.display_name ?? "未知卡片",
      nickname: card?.nickname ?? null,
      ruleName: rule.name,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      usedEligibleSpend: used,
      earnedRewardAmount: Number(row.earned_reward_amount),
      transactionCount: row.transaction_count,
      capType: rule.cap_type,
      eligibleSpendCap,
      rewardRate: Number(rule.reward_rate),
      remaining,
      requiresRegistration: !!rule.requires_registration,
      requiresBenefitSwitch: !!rule.requires_benefit_switch,
      requiresCoupon: !!rule.requires_coupon,
    };
  });
}
