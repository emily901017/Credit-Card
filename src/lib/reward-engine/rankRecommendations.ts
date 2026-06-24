import type {
  EngineRewardRule,
  RecommendationItem,
  RewardCalculation,
} from "./types";

// 對應 SDD 12.7：操作複雜度分數
export function complexityPoints(rule: EngineRewardRule): number {
  let points = 0;
  if (rule.requiresRegistration) points += 1;
  if (rule.requiresBenefitSwitch) points += 1;
  if (rule.requiresCoupon) points += 1;
  if (rule.verificationStatus !== "manual_verified") points += 2;
  return points;
}

// 對應 SDD 15.3 / 12.8：產生注意事項文案
export function buildNotes(
  rule: EngineRewardRule,
  calc: RewardCalculation,
): string[] {
  const notes: string[] = [];
  if (rule.requiresRegistration) notes.push("需確認已登錄");
  if (rule.requiresBenefitSwitch) notes.push("需確認已切換指定權益");
  if (rule.requiresCoupon) notes.push("需確認已領券");
  if (calc.willCap && calc.eligibleSpendApplied > 0) {
    notes.push("這筆刷完後此回饋池會封頂");
  }
  if (calc.remainingBefore !== null && calc.eligibleSpendApplied <= 0) {
    notes.push("此高回饋池本期已封頂，已改用一般回饋估算");
  }
  if (calc.excessSpend > 0 && calc.remainingBefore !== null) {
    notes.push("超過高回饋額度的部分以一般回饋計算");
  }
  return notes;
}

// 對應 SDD 12.7 排序分數
export function score(
  calc: RewardCalculation,
  points: number,
): number {
  return calc.totalReward - points * 5;
}

// 對應 SDD 12.3 第 6、7 點 + 12.7：最終排序
// 主要：score 高者優先；其次剩餘額度高者優先；再次複雜度低者優先。
export function rankItems(
  items: Omit<RecommendationItem, "rank">[],
): RecommendationItem[] {
  const sorted = [...items].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;

    const aRemain = a.remainingAfter ?? Number.POSITIVE_INFINITY;
    const bRemain = b.remainingAfter ?? Number.POSITIVE_INFINITY;
    if (bRemain !== aRemain) return bRemain - aRemain;

    return a.complexityPoints - b.complexityPoints;
  });

  return sorted.map((item, index) => ({ ...item, rank: index + 1 }));
}
