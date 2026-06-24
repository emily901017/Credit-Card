import { calculateReward } from "./calculateReward";
import { isRuleApplicable, pickBestRuleForCard } from "./matchRewardRule";
import {
  buildNotes,
  complexityPoints,
  rankItems,
  score,
} from "./rankRecommendations";
import { usageKey } from "./types";
import type {
  EngineMerchant,
  EngineRewardRule,
  EngineUserCard,
  PoolUsageLookup,
  RecommendationItem,
  RecommendationResult,
} from "./types";

export type RecommendComputeArgs = {
  merchant: EngineMerchant;
  amount: number;
  paymentMethod?: string | null;
  transactionDate: string;
  userCards: EngineUserCard[];
  rules: EngineRewardRule[]; // 全部可能規則（通常為使用者持有卡的規則）
  usage: PoolUsageLookup; // 已使用的高回饋額度（依期間查得）
};

// 推薦引擎主流程（純函式，不碰 DB）。
// 1) 對每張使用者卡，找出適用規則並挑出最佳規則
// 2) 計算回饋
// 3) 套用複雜度與分數
// 4) 排序
export function computeRecommendations(
  args: RecommendComputeArgs,
): RecommendationResult {
  const { merchant, amount, paymentMethod, transactionDate, userCards, rules } =
    args;

  // 以 cardId 分組規則，方便每張卡挑最佳
  const rulesByCard = new Map<string, EngineRewardRule[]>();
  for (const rule of rules) {
    if (!isRuleApplicable(rule, merchant, paymentMethod, transactionDate)) {
      continue;
    }
    const list = rulesByCard.get(rule.cardId) ?? [];
    list.push(rule);
    rulesByCard.set(rule.cardId, list);
  }

  const items: Omit<RecommendationItem, "rank">[] = [];

  for (const userCard of userCards) {
    const cardRules = rulesByCard.get(userCard.cardId) ?? [];
    const best = pickBestRuleForCard(cardRules, paymentMethod);
    if (!best) continue;

    const used = args.usage[usageKey(best.id, userCard.userCardId)] ?? 0;
    const calc = calculateReward(best, amount, used);
    const points = complexityPoints(best);

    items.push({
      userCardId: userCard.userCardId,
      cardDisplayName: userCard.nickname
        ? `${userCard.cardDisplayName}（${userCard.nickname}）`
        : userCard.cardDisplayName,
      rewardRuleId: best.id,
      rewardRuleName: best.name,
      estimatedRewardRate: best.rewardRate,
      effectiveRewardRate: calc.effectiveRewardRate,
      estimatedRewardAmount: calc.totalReward,
      eligibleSpendApplied: calc.eligibleSpendApplied,
      excessSpend: calc.excessSpend,
      remainingBefore: calc.remainingBefore,
      remainingAfter: calc.remainingAfter,
      requiresRegistration: !!best.requiresRegistration,
      requiresBenefitSwitch: !!best.requiresBenefitSwitch,
      requiresCoupon: !!best.requiresCoupon,
      complexityPoints: points,
      score: score(calc, points),
      notes: buildNotes(best, calc),
    });
  }

  return {
    merchant: { id: merchant.id, displayName: merchant.displayName },
    amount,
    paymentMethod: paymentMethod ?? null,
    transactionDate,
    recommendations: rankItems(items),
  };
}
