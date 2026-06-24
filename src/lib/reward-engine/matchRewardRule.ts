import type { EngineMerchant, EngineRewardRule } from "./types";

// 對應 SDD 12.2：判斷一條規則是否適用於本次消費
export function isRuleApplicable(
  rule: EngineRewardRule,
  merchant: EngineMerchant,
  paymentMethod: string | null | undefined,
  transactionDate: string,
): boolean {
  // 有效期間
  if (rule.validFrom > transactionDate) return false;
  if (rule.validTo && rule.validTo < transactionDate) return false;

  // 商家 / 類別範圍
  if (!isScopeMatched(rule, merchant)) return false;

  // 支付方式：null 表示不限；否則需包含指定 paymentMethod
  if (rule.paymentMethods && rule.paymentMethods.length > 0) {
    if (!paymentMethod) return false;
    if (!rule.paymentMethods.includes(paymentMethod)) return false;
  }

  return true;
}

function isScopeMatched(
  rule: EngineRewardRule,
  merchant: EngineMerchant,
): boolean {
  switch (rule.merchantScopeType) {
    case "all":
    case "general":
      return true;
    case "merchant_list":
      return !!rule.merchantIds?.includes(merchant.id);
    case "category":
      return !!rule.categoryScope?.includes(merchant.category);
    case "overseas":
      return merchant.category === "overseas";
    default:
      return false;
  }
}

// scope 的特定程度（數字越大越精準），對應 SDD 12.3 第 1、2 點
function scopeSpecificity(rule: EngineRewardRule): number {
  switch (rule.merchantScopeType) {
    case "merchant_list":
      return 4;
    case "overseas":
      return 3;
    case "category":
      return 2;
    case "all":
      return 1;
    case "general":
    default:
      return 0;
  }
}

// 支付方式符合者優先（有指定且符合 = 較精準）
function paymentSpecificity(
  rule: EngineRewardRule,
  paymentMethod: string | null | undefined,
): number {
  if (
    rule.paymentMethods &&
    rule.paymentMethods.length > 0 &&
    paymentMethod &&
    rule.paymentMethods.includes(paymentMethod)
  ) {
    return 1;
  }
  return 0;
}

// 對應 SDD 12.3：在「同一張卡」的多條適用規則中挑出最佳規則。
// 排序優先序：
//   1. merchant_list 優先；2. category 優先於 general；3. 支付方式符合者優先；
//   4. priority 數字較小者優先；5. reward_rate 較高者優先。
//   （第 6「剩餘額度較高」、第 7「操作複雜度較低」於 rank 階段一起考量）
export function pickBestRuleForCard(
  rules: EngineRewardRule[],
  paymentMethod: string | null | undefined,
): EngineRewardRule | null {
  if (rules.length === 0) return null;

  const sorted = [...rules].sort((a, b) => {
    const scopeDiff = scopeSpecificity(b) - scopeSpecificity(a);
    if (scopeDiff !== 0) return scopeDiff;

    const payDiff =
      paymentSpecificity(b, paymentMethod) -
      paymentSpecificity(a, paymentMethod);
    if (payDiff !== 0) return payDiff;

    const priorityDiff = (a.priority ?? 100) - (b.priority ?? 100);
    if (priorityDiff !== 0) return priorityDiff;

    return b.rewardRate - a.rewardRate;
  });

  return sorted[0];
}

// 從一組規則中，挑出適用於本次消費（商家/日期/支付方式）且最佳的規則。
// 用於「確認交易 / 手動新增交易」時，依實際資料重新匹配規則（SDD 17.3）。
export function matchBestRule(
  rules: EngineRewardRule[],
  merchant: EngineMerchant,
  paymentMethod: string | null | undefined,
  transactionDate: string,
): EngineRewardRule | null {
  const applicable = rules.filter((rule) =>
    isRuleApplicable(rule, merchant, paymentMethod, transactionDate),
  );
  return pickBestRuleForCard(applicable, paymentMethod);
}
