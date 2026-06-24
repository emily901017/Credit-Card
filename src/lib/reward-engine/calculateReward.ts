import type { EngineRewardRule, RewardCalculation } from "./types";

// 對應 SDD 12.5 / 12.6：依規則、金額與已使用額度，計算本筆回饋。
export function calculateReward(
  rule: EngineRewardRule,
  amount: number,
  usedEligibleSpend: number,
): RewardCalculation {
  let remainingBefore: number | null;
  let eligibleSpendApplied: number;

  if (rule.capType === "none") {
    // 無上限
    remainingBefore = null;
    eligibleSpendApplied = amount;
  } else {
    // 計算高回饋的可用額度上限
    let cap: number;
    if (rule.capType === "eligible_spend") {
      cap = rule.eligibleSpendCap ?? 0;
    } else {
      // reward_amount：以回饋金額上限換算成可用消費額度
      // computed_eligible_spend_cap = cap_value / reward_rate
      cap = rule.rewardRate > 0 ? (rule.capValue ?? 0) / rule.rewardRate : 0;
    }

    const remaining = cap - usedEligibleSpend;
    remainingBefore = Math.max(remaining, 0);
    eligibleSpendApplied = Math.min(amount, Math.max(remaining, 0));
  }

  const excessSpend = amount - eligibleSpendApplied;
  const highRewardAmount = eligibleSpendApplied * rule.rewardRate;
  // base_reward_rate 為 null 時，超額部分回饋為 0（SDD 12.6）
  const baseRewardAmount = excessSpend * (rule.baseRewardRate ?? 0);
  const totalReward = highRewardAmount + baseRewardAmount;
  const effectiveRewardRate = amount > 0 ? totalReward / amount : 0;

  const remainingAfter =
    remainingBefore === null
      ? null
      : Math.max(remainingBefore - eligibleSpendApplied, 0);

  const willCap = remainingAfter !== null && remainingAfter <= 0;

  return {
    eligibleSpendApplied,
    excessSpend,
    highRewardAmount,
    baseRewardAmount,
    totalReward,
    effectiveRewardRate,
    remainingBefore,
    remainingAfter,
    willCap,
  };
}
