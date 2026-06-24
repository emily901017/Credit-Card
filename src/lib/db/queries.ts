import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Card,
  Merchant,
  RewardRule,
  UserCard,
} from "@/types/database";
import { computePeriod } from "@/lib/reward-engine/period";
import { computeRecommendations } from "@/lib/reward-engine/recommend";
import type {
  EngineMerchant,
  EngineRewardRule,
  EngineUserCard,
  PoolUsageLookup,
  RecommendationInput,
  RecommendationResult,
} from "@/lib/reward-engine/types";
import { usageKey } from "@/lib/reward-engine/types";
import { normalizeAlias } from "@/lib/utils/normalize";

// ---------------------------------------------------------
// 卡片
// ---------------------------------------------------------
export async function getCards(supabase: SupabaseClient): Promise<Card[]> {
  const { data, error } = await supabase
    .from("cards")
    .select("*")
    .eq("is_active", true)
    .order("display_name");
  if (error) throw error;
  return data ?? [];
}

export type UserCardWithCard = UserCard & { card: Card };

export async function getUserCards(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserCardWithCard[]> {
  const { data, error } = await supabase
    .from("user_cards")
    .select("*, card:cards(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as UserCardWithCard[];
}

export async function addUserCard(
  supabase: SupabaseClient,
  userId: string,
  cardId: string,
  nickname?: string | null,
  last4?: string | null,
): Promise<UserCard> {
  const { data, error } = await supabase
    .from("user_cards")
    .insert({
      user_id: userId,
      card_id: cardId,
      nickname: nickname || null,
      last4: last4 || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as UserCard;
}

export async function deactivateUserCard(
  supabase: SupabaseClient,
  userCardId: string,
): Promise<void> {
  const { error } = await supabase
    .from("user_cards")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", userCardId);
  if (error) throw error;
}

export async function reactivateUserCard(
  supabase: SupabaseClient,
  userCardId: string,
): Promise<void> {
  const { error } = await supabase
    .from("user_cards")
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq("id", userCardId);
  if (error) throw error;
}

// ---------------------------------------------------------
// 商家解析（SDD 7.4 / 13.2）
// ---------------------------------------------------------
export async function getMerchants(
  supabase: SupabaseClient,
): Promise<Merchant[]> {
  const { data, error } = await supabase
    .from("merchants")
    .select("*")
    .eq("is_active", true)
    .order("display_name");
  if (error) throw error;
  return data ?? [];
}

export async function searchMerchants(
  supabase: SupabaseClient,
  query: string,
): Promise<Merchant[]> {
  if (!query.trim()) {
    const { data } = await supabase
      .from("merchants")
      .select("*")
      .eq("is_active", true)
      .order("display_name");
    return data ?? [];
  }
  const { data, error } = await supabase
    .from("merchants")
    .select("*")
    .eq("is_active", true)
    .or(`name.ilike.%${query}%,display_name.ilike.%${query}%`)
    .order("display_name");
  if (error) throw error;
  return data ?? [];
}

// 先比對 merchant_aliases 的 normalized_alias，再退回名稱模糊比對。
export async function resolveMerchant(
  supabase: SupabaseClient,
  input: string,
): Promise<Merchant | null> {
  const normalized = normalizeAlias(input);

  const { data: alias } = await supabase
    .from("merchant_aliases")
    .select("merchant_id")
    .eq("normalized_alias", normalized)
    .maybeSingle();

  if (alias?.merchant_id) {
    const { data: merchant } = await supabase
      .from("merchants")
      .select("*")
      .eq("id", alias.merchant_id)
      .maybeSingle();
    if (merchant) return merchant as Merchant;
  }

  // 退回模糊比對
  const results = await searchMerchants(supabase, input.trim());
  return results[0] ?? null;
}

// ---------------------------------------------------------
// 推薦（SDD 12 + 13.2）
// ---------------------------------------------------------

function toEngineRule(row: RewardRule): EngineRewardRule {
  return {
    id: row.id,
    cardId: row.card_id,
    name: row.name,
    merchantScopeType: row.merchant_scope_type,
    merchantIds: row.merchant_ids,
    categoryScope: row.category_scope,
    paymentMethods: row.payment_methods,
    rewardType: row.reward_type,
    rewardRate: Number(row.reward_rate),
    baseRewardRate: row.base_reward_rate === null ? null : Number(row.base_reward_rate),
    capType: row.cap_type,
    capValue: row.cap_value === null ? null : Number(row.cap_value),
    eligibleSpendCap:
      row.eligible_spend_cap === null ? null : Number(row.eligible_spend_cap),
    periodType: row.period_type,
    validFrom: row.valid_from,
    validTo: row.valid_to,
    requiresRegistration: !!row.requires_registration,
    requiresBenefitSwitch: !!row.requires_benefit_switch,
    requiresCoupon: !!row.requires_coupon,
    priority: row.priority ?? 100,
    verificationStatus: row.verification_status,
  };
}

// 取得推薦：載入使用者啟用中的卡、相關規則與回饋池使用量，再交給純引擎計算。
export async function getRecommendation(
  supabase: SupabaseClient,
  input: RecommendationInput,
): Promise<RecommendationResult> {
  // 1. 商家
  const { data: merchantRow, error: merchantErr } = await supabase
    .from("merchants")
    .select("*")
    .eq("id", input.merchantId)
    .single();
  if (merchantErr) throw merchantErr;
  const merchant: EngineMerchant = {
    id: merchantRow.id,
    displayName: merchantRow.display_name,
    category: merchantRow.category,
  };

  // 2. 使用者啟用中的持有卡
  const userCardRows = await getUserCards(supabase, input.userId);
  const activeUserCards = userCardRows.filter((uc) => uc.is_active !== false);
  const userCards: EngineUserCard[] = activeUserCards.map((uc) => ({
    userCardId: uc.id,
    cardId: uc.card_id,
    cardDisplayName: uc.card?.display_name ?? "未知卡片",
    nickname: uc.nickname,
  }));

  if (userCards.length === 0) {
    return {
      merchant: { id: merchant.id, displayName: merchant.displayName },
      amount: input.amount,
      paymentMethod: input.paymentMethod ?? null,
      transactionDate: input.transactionDate,
      recommendations: [],
    };
  }

  // 3. 這些卡的可用規則
  const cardIds = Array.from(new Set(userCards.map((uc) => uc.cardId)));
  const { data: ruleRows, error: ruleErr } = await supabase
    .from("reward_rules")
    .select("*")
    .in("card_id", cardIds)
    .eq("is_active", true);
  if (ruleErr) throw ruleErr;
  const rules = (ruleRows ?? []).map((r) => toEngineRule(r as RewardRule));

  // 4. 回饋池使用量（依各規則期間查詢）
  const usage: PoolUsageLookup = {};
  const { data: usageRows } = await supabase
    .from("reward_pool_usages")
    .select("reward_rule_id, user_card_id, period_start, period_end, used_eligible_spend")
    .eq("user_id", input.userId);

  for (const userCard of userCards) {
    for (const rule of rules) {
      if (rule.cardId !== userCard.cardId) continue;
      const period = computePeriod(rule, input.transactionDate);
      const match = (usageRows ?? []).find(
        (u) =>
          u.reward_rule_id === rule.id &&
          u.user_card_id === userCard.userCardId &&
          u.period_start === period.periodStart &&
          u.period_end === period.periodEnd,
      );
      if (match) {
        usage[usageKey(rule.id, userCard.userCardId)] = Number(
          match.used_eligible_spend,
        );
      }
    }
  }

  // 5. 純引擎計算
  return computeRecommendations({
    merchant,
    amount: input.amount,
    paymentMethod: input.paymentMethod,
    transactionDate: input.transactionDate,
    userCards,
    rules,
    usage,
  });
}

// 儲存推薦快照（SDD 17.2）
export async function createRecommendation(
  supabase: SupabaseClient,
  userId: string,
  input: RecommendationInput,
  result: RecommendationResult,
): Promise<string> {
  const { data, error } = await supabase
    .from("recommendations")
    .insert({
      user_id: userId,
      merchant_id: input.merchantId,
      amount: input.amount,
      payment_method: input.paymentMethod ?? null,
      transaction_date: input.transactionDate,
      result_json: result,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}
