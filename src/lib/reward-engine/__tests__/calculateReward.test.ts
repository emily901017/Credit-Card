import { describe, expect, it } from "vitest";
import { calculateReward } from "../calculateReward";
import { computePeriod } from "../period";
import { computeRecommendations } from "../recommend";
import type { EngineMerchant, EngineRewardRule } from "../types";

function makeRule(overrides: Partial<EngineRewardRule>): EngineRewardRule {
  return {
    id: "rule-1",
    cardId: "card-1",
    name: "test rule",
    merchantScopeType: "general",
    merchantIds: null,
    categoryScope: null,
    paymentMethods: null,
    rewardType: "cashback",
    rewardRate: 0.01,
    baseRewardRate: null,
    capType: "none",
    capValue: null,
    eligibleSpendCap: null,
    periodType: "calendar_month",
    validFrom: "2026-01-01",
    validTo: null,
    requiresRegistration: false,
    requiresBenefitSwitch: false,
    requiresCoupon: false,
    priority: 100,
    verificationStatus: "manual_verified",
    ...overrides,
  };
}

describe("calculateReward (SDD 20.1)", () => {
  it("1. 無上限規則：全額計算高回饋", () => {
    const rule = makeRule({ capType: "none", rewardRate: 0.01 });
    const calc = calculateReward(rule, 8000, 0);
    expect(calc.eligibleSpendApplied).toBe(8000);
    expect(calc.totalReward).toBeCloseTo(80);
    expect(calc.remainingBefore).toBeNull();
    expect(calc.willCap).toBe(false);
  });

  it("2. eligible_spend cap：限制可吃高回饋金額", () => {
    const rule = makeRule({
      capType: "eligible_spend",
      eligibleSpendCap: 6666,
      rewardRate: 0.045,
      baseRewardRate: 0.005,
    });
    const calc = calculateReward(rule, 8000, 0);
    expect(calc.eligibleSpendApplied).toBe(6666);
    expect(calc.excessSpend).toBe(1334);
    expect(calc.highRewardAmount).toBeCloseTo(6666 * 0.045);
    expect(calc.baseRewardAmount).toBeCloseTo(1334 * 0.005);
    expect(calc.willCap).toBe(true);
  });

  it("3. reward_amount cap：以回饋上限換算消費額度", () => {
    const rule = makeRule({
      capType: "reward_amount",
      capValue: 300,
      rewardRate: 0.03,
      baseRewardRate: 0.003,
    });
    // computed cap = 300 / 0.03 = 10000
    const calc = calculateReward(rule, 8000, 0);
    expect(calc.eligibleSpendApplied).toBe(8000);
    expect(calc.remainingBefore).toBe(10000);
    expect(calc.willCap).toBe(false);
  });

  it("4. 部分封頂：已用一部分額度", () => {
    const rule = makeRule({
      capType: "eligible_spend",
      eligibleSpendCap: 6666,
      rewardRate: 0.045,
      baseRewardRate: 0.005,
    });
    const calc = calculateReward(rule, 8000, 4000);
    expect(calc.remainingBefore).toBe(2666);
    expect(calc.eligibleSpendApplied).toBe(2666);
    expect(calc.excessSpend).toBe(8000 - 2666);
    expect(calc.willCap).toBe(true);
  });

  it("5. 完全封頂：剩餘額度為 0，只剩 base 回饋", () => {
    const rule = makeRule({
      capType: "eligible_spend",
      eligibleSpendCap: 6666,
      rewardRate: 0.045,
      baseRewardRate: 0.005,
    });
    const calc = calculateReward(rule, 8000, 6666);
    expect(calc.eligibleSpendApplied).toBe(0);
    expect(calc.highRewardAmount).toBe(0);
    expect(calc.baseRewardAmount).toBeCloseTo(8000 * 0.005);
  });

  it("6. 超額部分套用 base reward；無 base 則為 0", () => {
    const withBase = makeRule({
      capType: "eligible_spend",
      eligibleSpendCap: 1000,
      rewardRate: 0.05,
      baseRewardRate: 0.01,
    });
    const calcA = calculateReward(withBase, 3000, 0);
    expect(calcA.baseRewardAmount).toBeCloseTo(2000 * 0.01);

    const noBase = makeRule({
      capType: "eligible_spend",
      eligibleSpendCap: 1000,
      rewardRate: 0.05,
      baseRewardRate: null,
    });
    const calcB = calculateReward(noBase, 3000, 0);
    expect(calcB.baseRewardAmount).toBe(0);
  });
});

describe("computePeriod (SDD 12.4)", () => {
  it("calendar_month：當月第一天到最後一天", () => {
    const rule = makeRule({ periodType: "calendar_month" });
    const p = computePeriod(rule, "2026-06-24");
    expect(p.periodStart).toBe("2026-06-01");
    expect(p.periodEnd).toBe("2026-06-30");
  });

  it("campaign_period：使用 valid_from / valid_to", () => {
    const rule = makeRule({
      periodType: "campaign_period",
      validFrom: "2026-06-01",
      validTo: "2026-06-30",
    });
    const p = computePeriod(rule, "2026-06-24");
    expect(p.periodStart).toBe("2026-06-01");
    expect(p.periodEnd).toBe("2026-06-30");
  });
});

const merchantMomo: EngineMerchant = {
  id: "m-momo",
  displayName: "momo購物網",
  category: "online_shopping",
};

describe("computeRecommendations 規則優先序 (SDD 20.1)", () => {
  const userCards = [
    { userCardId: "uc-1", cardId: "card-1", cardDisplayName: "卡A" },
  ];

  it("7/8. 需登錄、需切權益會列入注意事項並增加複雜度", () => {
    const rule = makeRule({
      requiresRegistration: true,
      requiresBenefitSwitch: true,
      rewardRate: 0.03,
    });
    const result = computeRecommendations({
      merchant: merchantMomo,
      amount: 5000,
      transactionDate: "2026-06-24",
      userCards,
      rules: [rule],
      usage: {},
    });
    const item = result.recommendations[0];
    expect(item.requiresRegistration).toBe(true);
    expect(item.requiresBenefitSwitch).toBe(true);
    expect(item.complexityPoints).toBe(2);
    expect(item.notes).toContain("需確認已登錄");
    expect(item.notes).toContain("需確認已切換指定權益");
  });

  it("9. 活動已過期的規則不適用", () => {
    const expired = makeRule({
      periodType: "campaign_period",
      validFrom: "2026-05-01",
      validTo: "2026-05-31",
    });
    const result = computeRecommendations({
      merchant: merchantMomo,
      amount: 5000,
      transactionDate: "2026-06-24",
      userCards,
      rules: [expired],
      usage: {},
    });
    expect(result.recommendations).toHaveLength(0);
  });

  it("10. 商家專屬規則優先於類別規則", () => {
    const merchantRule = makeRule({
      id: "r-merchant",
      merchantScopeType: "merchant_list",
      merchantIds: ["m-momo"],
      rewardRate: 0.02,
    });
    const categoryRule = makeRule({
      id: "r-category",
      merchantScopeType: "category",
      categoryScope: ["online_shopping"],
      rewardRate: 0.05,
    });
    const result = computeRecommendations({
      merchant: merchantMomo,
      amount: 5000,
      transactionDate: "2026-06-24",
      userCards,
      rules: [categoryRule, merchantRule],
      usage: {},
    });
    // 同一張卡只會選一條規則，且 merchant_list 優先
    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0].rewardRuleId).toBe("r-merchant");
  });

  it("11. 類別規則優先於一般規則", () => {
    const generalRule = makeRule({
      id: "r-general",
      merchantScopeType: "general",
      rewardRate: 0.05,
    });
    const categoryRule = makeRule({
      id: "r-category",
      merchantScopeType: "category",
      categoryScope: ["online_shopping"],
      rewardRate: 0.02,
    });
    const result = computeRecommendations({
      merchant: merchantMomo,
      amount: 5000,
      transactionDate: "2026-06-24",
      userCards,
      rules: [generalRule, categoryRule],
      usage: {},
    });
    expect(result.recommendations[0].rewardRuleId).toBe("r-category");
  });
});
