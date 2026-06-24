// 信用卡回饋助理 - 資料庫型別
// 對應 SDD 第 9 章。手動維護；未來可改用 supabase gen types 自動產生。

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ---- 列舉值（對應 SDD） ----
export type MerchantCategory =
  | "online_shopping"
  | "convenience_store"
  | "grocery"
  | "department_store"
  | "dining"
  | "delivery"
  | "travel"
  | "transportation"
  | "fuel"
  | "overseas"
  | "general";

export type MerchantScopeType =
  | "all"
  | "merchant_list"
  | "category"
  | "overseas"
  | "general";

export type RewardType = "cashback" | "points" | "miles" | "statement_credit";

export type CapType = "none" | "reward_amount" | "eligible_spend";

export type PeriodType =
  | "calendar_month"
  | "calendar_quarter"
  | "campaign_period"
  | "billing_cycle";

export type VerificationStatus =
  | "draft"
  | "manual_verified"
  | "manual_verified_demo"
  | "needs_review"
  | "expired";

export type PendingTransactionStatus =
  | "pending"
  | "completed"
  | "cancelled"
  | "expired";

export type TransactionStatus = "confirmed" | "voided";

// ---- 資料表 Row ----
export interface Card {
  id: string;
  issuer: string;
  name: string;
  display_name: string;
  card_type: string | null;
  is_active: boolean | null;
  official_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserCard {
  id: string;
  user_id: string;
  card_id: string;
  nickname: string | null;
  last4: string | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface Merchant {
  id: string;
  name: string;
  display_name: string;
  category: MerchantCategory;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface MerchantAlias {
  id: string;
  merchant_id: string;
  alias: string;
  normalized_alias: string;
  created_at: string;
}

export interface RewardRule {
  id: string;
  card_id: string;
  name: string;
  description: string | null;
  merchant_scope_type: MerchantScopeType;
  merchant_ids: string[] | null;
  category_scope: string[] | null;
  payment_methods: string[] | null;
  reward_type: RewardType;
  reward_rate: number;
  base_reward_rate: number | null;
  cap_type: CapType;
  cap_value: number | null;
  eligible_spend_cap: number | null;
  period_type: PeriodType;
  valid_from: string;
  valid_to: string | null;
  reset_day: number | null;
  requires_registration: boolean | null;
  requires_benefit_switch: boolean | null;
  requires_coupon: boolean | null;
  excluded_transaction_types: string[] | null;
  priority: number | null;
  source_url: string | null;
  source_last_checked_at: string | null;
  verification_status: VerificationStatus;
  version: number | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface RewardPoolUsage {
  id: string;
  user_id: string;
  reward_rule_id: string;
  user_card_id: string;
  period_start: string;
  period_end: string;
  used_eligible_spend: number;
  earned_reward_amount: number;
  transaction_count: number;
  created_at: string;
  updated_at: string;
}

export interface Recommendation {
  id: string;
  user_id: string;
  merchant_id: string;
  amount: number;
  payment_method: string | null;
  transaction_date: string;
  result_json: Json;
  created_at: string;
}

export interface PendingTransaction {
  id: string;
  user_id: string;
  merchant_id: string;
  estimated_amount: number;
  recommended_user_card_id: string | null;
  recommended_reward_rule_id: string | null;
  payment_method: string | null;
  recommendation_id: string | null;
  recommendation_snapshot: Json;
  status: PendingTransactionStatus;
  remind_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  pending_transaction_id: string | null;
  merchant_id: string;
  user_card_id: string;
  reward_rule_id: string | null;
  transaction_date: string;
  amount: number;
  payment_method: string | null;
  matched_reward_rate: number | null;
  eligible_spend_applied: number;
  estimated_reward_amount: number;
  status: TransactionStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
