import type {
  CapType,
  MerchantScopeType,
  PeriodType,
  RewardType,
  VerificationStatus,
} from "@/types/database";

// 對應 SDD 12.1
export type RecommendationInput = {
  userId: string;
  merchantId: string;
  amount: number;
  paymentMethod?: string | null;
  transactionDate: string; // YYYY-MM-DD
};

// 推薦引擎需要的商家資訊
export type EngineMerchant = {
  id: string;
  displayName: string;
  category: string;
};

// 使用者持有卡（含全域卡片顯示名稱）
export type EngineUserCard = {
  userCardId: string;
  cardId: string;
  cardDisplayName: string;
  nickname?: string | null;
};

// 引擎使用的回饋規則（對應 reward_rules 子集）
export type EngineRewardRule = {
  id: string;
  cardId: string;
  name: string;
  merchantScopeType: MerchantScopeType;
  merchantIds: string[] | null;
  categoryScope: string[] | null;
  paymentMethods: string[] | null;
  rewardType: RewardType;
  rewardRate: number;
  baseRewardRate: number | null;
  capType: CapType;
  capValue: number | null;
  eligibleSpendCap: number | null;
  periodType: PeriodType;
  validFrom: string;
  validTo: string | null;
  requiresRegistration: boolean;
  requiresBenefitSwitch: boolean;
  requiresCoupon: boolean;
  priority: number;
  verificationStatus: VerificationStatus;
};

// 某張卡某條規則目前已使用的高回饋額度（依期間查得）
export type PoolUsageLookup = {
  // key: `${rewardRuleId}:${userCardId}`
  [key: string]: number;
};

export function usageKey(rewardRuleId: string, userCardId: string): string {
  return `${rewardRuleId}:${userCardId}`;
}

// 單筆回饋計算結果
export type RewardCalculation = {
  eligibleSpendApplied: number;
  excessSpend: number;
  highRewardAmount: number;
  baseRewardAmount: number;
  totalReward: number;
  effectiveRewardRate: number;
  remainingBefore: number | null; // null 表示無上限
  remainingAfter: number | null;
  willCap: boolean; // 這筆刷完是否封頂
};

// 推薦結果中的單筆（對應 SDD 12.8）
export type RecommendationItem = {
  rank: number;
  userCardId: string;
  cardDisplayName: string;
  rewardRuleId: string;
  rewardRuleName: string;
  estimatedRewardRate: number;
  effectiveRewardRate: number;
  estimatedRewardAmount: number;
  eligibleSpendApplied: number;
  excessSpend: number;
  remainingBefore: number | null;
  remainingAfter: number | null;
  requiresRegistration: boolean;
  requiresBenefitSwitch: boolean;
  requiresCoupon: boolean;
  complexityPoints: number;
  score: number;
  notes: string[];
};

// 完整推薦結果（對應 SDD 12.8）
export type RecommendationResult = {
  merchant: {
    id: string;
    displayName: string;
  };
  amount: number;
  paymentMethod: string | null;
  transactionDate: string;
  recommendations: RecommendationItem[];
};
