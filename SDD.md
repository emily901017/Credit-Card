# 信用卡回饋助理 MVP - 軟體設計文件 SDD

版本：Next.js Mobile-first PWA + Supabase

## 1. 文件目的

本文件定義「台灣信用卡回饋助理」MVP 的系統設計。

此 MVP 的目標是建立一個手機優先的 Web App，讓使用者可以在消費前輸入商家與金額，系統根據使用者已持有的信用卡、回饋規則與目前剩餘額度，推薦最適合的信用卡。

推薦後，系統可以建立一筆「待確認交易」。使用者稍後確認是否真的完成交易，以及最後用哪張卡、實際金額多少。確認後，系統會更新該使用者的回饋額度池，讓下一次推薦更準。

本文件是給 coding agent 使用，目標是建立第一個可運作的雛形。

---

## 2. 技術選型

### 2.1 採用技術

MVP 使用：

* Next.js
* React
* TypeScript
* Tailwind CSS
* Supabase Auth
* Supabase Postgres
* Supabase Row Level Security
* Vercel 部署
* Mobile-first PWA 設計

### 2.2 不使用的技術

MVP 不使用：

* Electron
* React Native
* Flutter
* 自架後端 Server
* 自建登入系統
* 銀行 API
* Open Banking
* Email / 簡訊 / 推播交易解析
* 自動爬蟲
* OCR

### 2.3 為什麼選這個技術路線

此 MVP 的最終目標是手機 App，但第一階段先做手機版 Web App。

原因：

1. 使用者可以直接用手機瀏覽器測試。
2. 不需要 App Store 或 Google Play 上架。
3. 不需要處理 iOS / Android 原生開發問題。
4. Supabase 可以快速處理登入、資料庫、權限。
5. Next.js + React + TypeScript 是主流組合，coding agent 容易產生程式。
6. 未來若要做 React Native App，可共用資料模型與部分 TypeScript 商業邏輯。

---

## 3. 產品摘要

### 3.1 一句話產品描述

一個手機版信用卡回饋助理，會根據使用者即將消費的商家與金額，推薦最適合的持有卡片，並在使用者確認交易後追蹤剩餘回饋額度。

### 3.2 MVP 核心流程

1. 使用者註冊或登入。
2. 使用者新增自己持有的信用卡。
3. 使用者輸入預計消費的商家、金額與支付方式。
4. 系統根據已持有卡片與回饋規則推薦最佳信用卡。
5. 使用者可以選擇：

   * 追蹤這筆消費
   * 我已完成這筆消費
   * 只是查詢
6. 若選擇追蹤，系統建立 pending transaction。
7. 使用者稍後確認：

   * 使用推薦卡完成交易
   * 使用其他卡完成交易
   * 金額有變動
   * 沒有交易
8. 系統建立 confirmed transaction。
9. 系統更新 reward pool usage。
10. 下一次推薦會根據更新後的剩餘額度計算。

### 3.3 MVP 產品定位

這個 MVP 不是完整信用卡比較網站。

這個 MVP 不是自動記帳 App。

這個 MVP 不是銀行交易同步工具。

這個 MVP 是：

「刷卡推薦 + 交易確認 + 回饋額度追蹤」的個人化決策工具。

---

## 4. MVP 範圍

### 4.1 包含範圍

MVP 必須包含：

* Supabase Auth 登入
* 使用者卡片錢包
* 手動建立的信用卡資料
* 手動建立的商家資料
* 手動建立的回饋規則
* 商家搜尋與別名解析
* 回饋計算
* 推薦排序
* 待確認交易
* 交易確認
* 手動新增交易
* 回饋池使用額度儀表板
* 基本 PWA mobile-first UI

### 4.2 不包含範圍

MVP 不包含：

* 銀行交易同步
* Email 解析
* 簡訊解析
* 手機推播讀取
* 發票載具整合
* 信用卡申辦導流
* 完整信用卡資料自動更新
* 後台爬蟲
* LLM 自動解析銀行規則
* 多人家庭共享卡包
* 原生手機 App

---

## 5. 系統架構

### 5.1 高層架構

```text
User Mobile Browser
        ↓
Next.js Web App
        ↓
Supabase Client SDK
        ↓
Supabase Auth + Supabase Postgres + RLS
```

### 5.2 Next.js 負責

* 前端頁面
* 表單互動
* 推薦結果 UI
* 呼叫 Supabase
* 部分商業邏輯
* PWA 設定
* 路由與頁面

### 5.3 Supabase 負責

* 使用者登入
* 使用者 session
* PostgreSQL 資料庫
* Row Level Security
* 資料 CRUD
* 資料權限控管

### 5.4 推薦引擎位置

MVP 可先把推薦邏輯放在 Next.js 專案中的純 TypeScript module。

建議路徑：

```text
src/lib/reward-engine/
  matchRewardRule.ts
  calculateReward.ts
  rankRecommendations.ts
  period.ts
  types.ts
```

未來若要做 React Native App，可以把這個資料夾抽成共用 package。

---

## 6. 專案結構

建議使用 Next.js App Router。

```text
credit-card-reward-assistant/
  app/
    layout.tsx
    page.tsx
    login/
      page.tsx
    onboarding/
      page.tsx
    ask/
      page.tsx
    cards/
      page.tsx
    pending/
      page.tsx
    transactions/
      page.tsx
    reward-pools/
      page.tsx
  components/
    AppShell.tsx
    BottomNav.tsx
    CardSelector.tsx
    MerchantSearch.tsx
    RecommendationCard.tsx
    RewardPoolProgress.tsx
    TransactionForm.tsx
    PendingTransactionCard.tsx
  lib/
    supabase/
      client.ts
      server.ts
    reward-engine/
      calculateReward.ts
      matchRewardRule.ts
      rankRecommendations.ts
      period.ts
      types.ts
    db/
      queries.ts
    utils/
      format.ts
      normalize.ts
  supabase/
    migrations/
    seed.sql
  public/
    manifest.json
    icons/
  types/
    database.ts
  package.json
```

---

## 7. 核心概念

### 7.1 Card：信用卡

全域信用卡資料。

範例：

* 玉山 Unicard
* 國泰 CUBE
* 台新 Richart
* 富邦 J 卡

Card 不屬於特定使用者。

### 7.2 User Card：使用者持有卡

使用者自己持有的信用卡。

範例：

* 使用者 A 持有玉山 Unicard
* 使用者 A 幫這張卡取暱稱：網購卡
* 可選填末四碼

### 7.3 Merchant：商家

商家或消費通路。

範例：

* momo
* 蝦皮
* PChome
* 全聯
* Costco
* 7-ELEVEN
* Uber Eats

### 7.4 Merchant Alias：商家別名

不同輸入對應到同一個商家。

範例：

* momo
* momo購物網
* 富邦 momo
* momo shopping

都應對應到 merchant `momo`。

### 7.5 Reward Rule：回饋規則

定義信用卡在特定商家、類別、支付方式、期間內的回饋。

範例：

* 卡片：玉山 Unicard
* 商家：momo
* 回饋率：4.5%
* 每月回饋上限：300 點
* 需切換權益：是
* 需登錄：是
* 有效期間：2026-06-01 至 2026-06-30

### 7.6 Reward Pool Usage：回饋池使用量

使用者在某一期間內，某張卡某條回饋規則已使用多少額度。

範例：

* 玉山 Unicard / momo 加碼
* 本月可吃高回饋額度：6,666 元
* 已使用：4,000 元
* 剩餘：2,666 元

### 7.7 Pending Transaction：待確認交易

使用者詢問推薦後，系統建立的待確認紀錄。

Pending transaction 不會影響回饋池。

### 7.8 Transaction：已確認交易

使用者確認完成的交易。

Confirmed transaction 會影響回饋池。

---

## 8. 使用者故事

### 8.1 註冊 / 登入

作為使用者，我想用 Email 登入，讓我的卡片與交易資料可以被保存。

驗收標準：

* 使用者可以註冊。
* 使用者可以登入。
* 使用者可以登出。
* 未登入使用者不能進入主要頁面。
* 登入後只能讀寫自己的資料。

### 8.2 新增持有卡片

作為使用者，我想新增自己持有的信用卡，讓系統從我的卡片中推薦。

驗收標準：

* 使用者可以瀏覽支援的卡片。
* 使用者可以新增卡片到「我的卡片」。
* 使用者可以停用卡片。
* 使用者可以選填暱稱與末四碼。
* 使用者只能看到自己的 user_cards。

### 8.3 詢問刷哪張

作為使用者，我想輸入商家與金額，讓系統推薦最佳卡片。

驗收標準：

* 使用者可以輸入商家。
* 使用者可以輸入金額。
* 使用者可以選填支付方式。
* 系統回傳推薦卡片排序。
* 推薦結果顯示：

  * 卡片名稱
  * 回饋池名稱
  * 預估回饋率
  * 預估回饋金額
  * 本筆可吃高回饋金額
  * 超額金額
  * 交易前剩餘額度
  * 交易後剩餘額度
  * 注意事項

### 8.4 追蹤這筆消費

作為使用者，我想在推薦後追蹤這筆消費，方便之後確認。

驗收標準：

* 推薦結果下方有三個動作：

  * 追蹤這筆
  * 我已刷完
  * 只是查詢
* 點「追蹤這筆」會建立 pending transaction。
* 點「我已刷完」會直接建立 confirmed transaction。
* 點「只是查詢」不建立紀錄。

### 8.5 確認待確認交易

作為使用者，我想確認最後是否真的交易，讓系統更新回饋額度。

驗收標準：

* 使用者可以確認：

  * 使用推薦卡
  * 改用其他卡
  * 修改金額
  * 沒有交易
* 若確認完成，建立 transaction。
* 若沒有交易，pending transaction 狀態改為 cancelled。
* confirmed transaction 會更新 reward_pool_usages。

### 8.6 手動新增交易

作為使用者，我想手動新增交易，補齊沒有從推薦流程產生的消費。

驗收標準：

* 使用者可以輸入日期、商家、卡片、金額、支付方式。
* 系統會匹配回饋規則。
* 系統會更新 reward pool usage。

### 8.7 查看回饋池

作為使用者，我想查看每張卡本月高回饋額度已刷多少、剩多少。

驗收標準：

* 顯示每張卡的回饋池列表。
* 每個回饋池有進度條。
* 顯示已用、剩餘、上限、回饋率、期間。
* 顯示需登錄、需切權益、需領券等提醒。

---

## 9. 資料庫設計

使用 Supabase Postgres。

所有使用者資料表必須包含 user_id，並啟用 Row Level Security。

### 9.1 profiles

Supabase Auth 的補充使用者資料。

欄位：

```sql
id uuid primary key references auth.users(id) on delete cascade,
email text,
display_name text,
timezone text default 'Asia/Taipei',
created_at timestamptz default now(),
updated_at timestamptz default now()
```

### 9.2 cards

全域信用卡資料表。

```sql
id uuid primary key default gen_random_uuid(),
issuer text not null,
name text not null,
display_name text not null,
card_type text default 'credit',
is_active boolean default true,
official_url text,
notes text,
created_at timestamptz default now(),
updated_at timestamptz default now()
```

建議 unique：

```sql
unique (issuer, name)
```

### 9.3 user_cards

使用者持有卡片。

```sql
id uuid primary key default gen_random_uuid(),
user_id uuid not null references auth.users(id) on delete cascade,
card_id uuid not null references cards(id),
nickname text,
last4 text,
is_active boolean default true,
created_at timestamptz default now(),
updated_at timestamptz default now()
```

索引：

```sql
create index user_cards_user_id_idx on user_cards(user_id);
create index user_cards_card_id_idx on user_cards(card_id);
```

### 9.4 merchants

全域商家資料表。

```sql
id uuid primary key default gen_random_uuid(),
name text not null,
display_name text not null,
category text not null,
is_active boolean default true,
created_at timestamptz default now(),
updated_at timestamptz default now()
```

MVP category values：

```text
online_shopping
convenience_store
grocery
department_store
dining
delivery
travel
transportation
fuel
overseas
general
```

### 9.5 merchant_aliases

商家別名。

```sql
id uuid primary key default gen_random_uuid(),
merchant_id uuid not null references merchants(id) on delete cascade,
alias text not null,
normalized_alias text not null,
created_at timestamptz default now()
```

建議 unique：

```sql
unique (normalized_alias)
```

### 9.6 reward_rules

全域回饋規則。

```sql
id uuid primary key default gen_random_uuid(),
card_id uuid not null references cards(id),
name text not null,
description text,
merchant_scope_type text not null,
merchant_ids uuid[],
category_scope text[],
payment_methods text[],
reward_type text not null default 'cashback',
reward_rate numeric not null,
base_reward_rate numeric,
cap_type text not null default 'none',
cap_value numeric,
eligible_spend_cap numeric,
period_type text not null,
valid_from date not null,
valid_to date,
reset_day integer,
requires_registration boolean default false,
requires_benefit_switch boolean default false,
requires_coupon boolean default false,
excluded_transaction_types text[],
priority integer default 100,
source_url text,
source_last_checked_at timestamptz,
verification_status text default 'manual_verified',
version integer default 1,
is_active boolean default true,
created_at timestamptz default now(),
updated_at timestamptz default now()
```

merchant_scope_type values：

```text
all
merchant_list
category
overseas
general
```

reward_type values：

```text
cashback
points
miles
statement_credit
```

cap_type values：

```text
none
reward_amount
eligible_spend
```

period_type values：

```text
calendar_month
calendar_quarter
campaign_period
billing_cycle
```

verification_status values：

```text
draft
manual_verified
manual_verified_demo
needs_review
expired
```

### 9.7 reward_pool_usages

使用者回饋池使用量。

```sql
id uuid primary key default gen_random_uuid(),
user_id uuid not null references auth.users(id) on delete cascade,
reward_rule_id uuid not null references reward_rules(id),
user_card_id uuid not null references user_cards(id),
period_start date not null,
period_end date not null,
used_eligible_spend numeric default 0,
earned_reward_amount numeric default 0,
transaction_count integer default 0,
created_at timestamptz default now(),
updated_at timestamptz default now()
```

建議 unique：

```sql
unique (user_id, reward_rule_id, user_card_id, period_start, period_end)
```

### 9.8 recommendations

每次推薦結果快照。

```sql
id uuid primary key default gen_random_uuid(),
user_id uuid not null references auth.users(id) on delete cascade,
merchant_id uuid not null references merchants(id),
amount numeric not null,
payment_method text,
transaction_date date not null default current_date,
result_json jsonb not null,
created_at timestamptz default now()
```

### 9.9 pending_transactions

待確認交易。

```sql
id uuid primary key default gen_random_uuid(),
user_id uuid not null references auth.users(id) on delete cascade,
merchant_id uuid not null references merchants(id),
estimated_amount numeric not null,
recommended_user_card_id uuid references user_cards(id),
recommended_reward_rule_id uuid references reward_rules(id),
payment_method text,
recommendation_id uuid references recommendations(id),
recommendation_snapshot jsonb not null,
status text default 'pending',
remind_at timestamptz,
expires_at timestamptz,
created_at timestamptz default now(),
updated_at timestamptz default now()
```

status values：

```text
pending
completed
cancelled
expired
```

### 9.10 transactions

已確認交易。

```sql
id uuid primary key default gen_random_uuid(),
user_id uuid not null references auth.users(id) on delete cascade,
pending_transaction_id uuid references pending_transactions(id),
merchant_id uuid not null references merchants(id),
user_card_id uuid not null references user_cards(id),
reward_rule_id uuid references reward_rules(id),
transaction_date date not null,
amount numeric not null,
payment_method text,
matched_reward_rate numeric,
eligible_spend_applied numeric default 0,
estimated_reward_amount numeric default 0,
status text default 'confirmed',
notes text,
created_at timestamptz default now(),
updated_at timestamptz default now()
```

status values：

```text
confirmed
voided
```

---

## 10. Row Level Security 設計

所有包含 user_id 的資料表都必須啟用 RLS：

* profiles
* user_cards
* reward_pool_usages
* recommendations
* pending_transactions
* transactions

### 10.1 profiles RLS

使用者只能讀寫自己的 profile。

```sql
alter table profiles enable row level security;

create policy "Users can view own profile"
on profiles for select
using (auth.uid() = id);

create policy "Users can update own profile"
on profiles for update
using (auth.uid() = id);

create policy "Users can insert own profile"
on profiles for insert
with check (auth.uid() = id);
```

### 10.2 user_cards RLS

```sql
alter table user_cards enable row level security;

create policy "Users can view own user cards"
on user_cards for select
using (auth.uid() = user_id);

create policy "Users can insert own user cards"
on user_cards for insert
with check (auth.uid() = user_id);

create policy "Users can update own user cards"
on user_cards for update
using (auth.uid() = user_id);

create policy "Users can delete own user cards"
on user_cards for delete
using (auth.uid() = user_id);
```

### 10.3 transactions RLS

```sql
alter table transactions enable row level security;

create policy "Users can view own transactions"
on transactions for select
using (auth.uid() = user_id);

create policy "Users can insert own transactions"
on transactions for insert
with check (auth.uid() = user_id);

create policy "Users can update own transactions"
on transactions for update
using (auth.uid() = user_id);

create policy "Users can delete own transactions"
on transactions for delete
using (auth.uid() = user_id);
```

### 10.4 其他 user_id 表

對以下資料表建立相同 user_id policy：

* reward_pool_usages
* recommendations
* pending_transactions

### 10.5 全域資料表讀取權限

以下資料表為全域公開讀取資料：

* cards
* merchants
* merchant_aliases
* reward_rules

MVP 可以允許 authenticated users select。

不要讓一般使用者 insert / update / delete 全域資料。

---

## 11. Seed Data

MVP 至少建立：

* 5 張 demo cards
* 10 個 demo merchants
* 10 條 demo reward rules
* merchant aliases

### 11.1 Demo Cards

可先建立：

* 玉山 Unicard
* 國泰 CUBE
* 台新 Richart
* 富邦 J 卡
* 中信 LINE Pay 卡

若規則尚非官方驗證，verification_status 使用：

```text
manual_verified_demo
```

### 11.2 Demo Merchants

至少建立：

* momo
* 蝦皮
* PChome
* Amazon
* 7-ELEVEN
* FamilyMart
* 全聯
* Costco
* Uber Eats
* foodpanda
* 一般消費
* 海外消費

### 11.3 Demo Rules

MVP 要包含以下規則類型：

1. 無上限一般消費規則
2. 每月高回饋消費上限規則
3. 回饋金額上限規則
4. 商家專屬規則
5. 類別規則
6. 需登錄規則
7. 需切權益規則
8. 活動期間規則

---

## 12. 回饋計算邏輯

### 12.1 推薦輸入

```ts
type RecommendationInput = {
  userId: string
  merchantId: string
  amount: number
  paymentMethod?: string
  transactionDate: string
}
```

### 12.2 候選規則

尋找符合以下條件的 reward_rules：

* card_id 屬於使用者啟用中的 user_cards
* is_active = true
* valid_from <= transaction_date
* valid_to is null 或 valid_to >= transaction_date
* 商家符合 merchant_ids，或類別符合 category_scope，或為 general rule
* payment_methods 為 null，或包含使用者指定的 paymentMethod

### 12.3 規則匹配優先順序

若同一張卡有多條符合規則：

1. merchant_list 優先
2. category 優先於 general
3. payment method 符合者優先
4. priority 數字較小者優先
5. reward_rate 較高者優先
6. 剩餘額度較高者優先
7. 操作複雜度較低者優先

### 12.4 期間計算

MVP 支援：

```text
calendar_month
campaign_period
```

calendar_month：

* period_start = 交易日期當月第一天
* period_end = 交易日期當月最後一天

campaign_period：

* period_start = reward_rule.valid_from
* period_end = reward_rule.valid_to

### 12.5 剩餘可用高回饋金額

若 cap_type = none：

```text
remaining_eligible_spend = null
eligible_spend_for_this_transaction = amount
```

若 cap_type = eligible_spend：

```text
remaining = eligible_spend_cap - used_eligible_spend
eligible_spend_for_this_transaction = min(amount, max(remaining, 0))
```

若 cap_type = reward_amount：

```text
computed_eligible_spend_cap = cap_value / reward_rate
remaining = computed_eligible_spend_cap - used_eligible_spend
eligible_spend_for_this_transaction = min(amount, max(remaining, 0))
```

### 12.6 回饋金額

```text
high_reward_amount = eligible_spend_for_this_transaction * reward_rate
excess_amount = amount - eligible_spend_for_this_transaction
base_reward_amount = excess_amount * base_reward_rate
total_reward = high_reward_amount + base_reward_amount
effective_reward_rate = total_reward / amount
```

若 base_reward_rate 為 null，則超額部分回饋為 0。

### 12.7 操作複雜度

```text
requires_registration: +1
requires_benefit_switch: +1
requires_coupon: +1
verification_status != manual_verified: +2
```

MVP 排序分數：

```text
score = estimated_reward_amount - complexity_points * 5
```

### 12.8 推薦結果格式

```json
{
  "merchant": {
    "id": "uuid",
    "displayName": "momo"
  },
  "amount": 8000,
  "recommendations": [
    {
      "rank": 1,
      "userCardId": "uuid",
      "cardDisplayName": "玉山 Unicard",
      "rewardRuleId": "uuid",
      "rewardRuleName": "指定網購加碼",
      "estimatedRewardRate": 0.045,
      "effectiveRewardRate": 0.0375,
      "estimatedRewardAmount": 300,
      "eligibleSpendApplied": 6666,
      "excessSpend": 1334,
      "remainingBefore": 6666,
      "remainingAfter": 0,
      "requiresRegistration": true,
      "requiresBenefitSwitch": true,
      "requiresCoupon": false,
      "notes": [
        "需確認已登錄",
        "需確認已切換指定權益",
        "這筆刷完後此回饋池會封頂"
      ]
    }
  ]
}
```

---

## 13. 資料操作設計

MVP 不需要自己寫 REST API。

使用 Next.js + Supabase Client 直接操作 Supabase。

### 13.1 Supabase Client

Browser client：

```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

Server client 可視需要加入。

### 13.2 主要資料操作

建議在 `src/lib/db/queries.ts` 封裝資料操作。

需要的 functions：

```ts
getCards()
getUserCards(userId)
addUserCard(userId, cardId, nickname, last4)
deactivateUserCard(userCardId)

searchMerchants(query)
resolveMerchant(input)

createRecommendation(input)
createPendingTransaction(input)
getPendingTransactions(userId)
confirmPendingTransaction(input)

createTransaction(input)
getTransactions(userId)
voidTransaction(transactionId)

getRewardPools(userId)
recalculateRewardPools(userId, period)
```

注意：

* 雖然 function 傳入 userId，但實際 Supabase RLS 也必須保護資料。
* 不可只靠前端判斷權限。
* 所有寫入 user_id 的地方必須使用目前登入使用者的 auth.uid。

---

## 14. 前端頁面設計

### 14.1 /login

功能：

* Email 登入
* Email 註冊
* 登出
* 顯示錯誤訊息

MVP 可以先支援：

* Email + password

未來可加入：

* Magic link
* Google login
* Apple login

### 14.2 /onboarding

功能：

* 第一次登入後選擇自己持有的卡片。
* 支援搜尋卡片。
* 支援新增多張卡。
* 完成後導向 /ask。

### 14.3 /ask

主功能頁。

表單欄位：

* 商家
* 金額
* 支付方式，可選
* 交易日期，預設今天

送出後顯示：

* 最佳推薦
* 備選推薦
* 預估回饋金額
* 有效回饋率
* 剩餘額度
* 注意事項

按鈕：

* 追蹤這筆
* 我已刷完
* 只是查詢

### 14.4 /pending

待確認交易頁。

顯示：

* 商家
* 預估金額
* 推薦卡
* 建立時間
* 狀態

操作：

* 使用推薦卡完成
* 改用其他卡
* 修改金額
* 沒有交易

### 14.5 /transactions

交易紀錄頁。

功能：

* 查看 confirmed transactions
* 手動新增交易
* 作廢交易

### 14.6 /reward-pools

回饋池頁。

功能：

* 依卡片顯示回饋池
* 顯示進度條
* 顯示已刷 / 上限 / 剩餘
* 顯示期間
* 顯示注意事項

### 14.7 /cards

我的卡片頁。

功能：

* 查看持有卡片
* 新增卡片
* 編輯暱稱
* 停用卡片

---

## 15. Mobile-first UI 原則

MVP 以手機畫面為主。

### 15.1 Layout

使用底部導覽列。

主要 tab：

* 詢問
* 待確認
* 額度
* 交易
* 我的卡

### 15.2 畫面優先順序

`/ask` 是首頁。

使用者登入後預設進入 `/ask`。

### 15.3 UI 文案

避免說「記帳」。

優先使用：

* 追蹤這筆
* 更新回饋額度
* 幫下次推薦更準
* 本月高回饋剩餘額度
* 這筆刷完會封頂

推薦結果範例：

```text
建議使用：玉山 Unicard

預估回饋：4.5%，約 360 點
本月此回饋池已刷：2,000 / 10,000
這筆刷完後剩餘：0

注意事項：
- 需確認已登錄
- 需確認已切換指定權益
- 這筆刷完後此回饋池會封頂

要幫你追蹤這筆嗎？
[追蹤這筆] [我已刷完] [只是查詢]
```

---

## 16. PWA 設計

MVP 可加入基本 PWA 支援。

### 16.1 manifest.json

需要包含：

```json
{
  "name": "信用卡回饋助理",
  "short_name": "刷卡助理",
  "start_url": "/ask",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#111111",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### 16.2 MVP PWA 範圍

MVP 只需支援：

* 加入手機主畫面
* Mobile-first layout
* standalone display

MVP 不必先做：

* 離線模式
* Push notification
* Background sync

---

## 17. 商業規則

### 17.1 Pending 不影響額度

pending_transactions 不會影響 reward_pool_usages。

只有 confirmed transactions 會影響額度。

### 17.2 推薦快照

每次推薦都要存入 recommendations.result_json。

原因：

* 回饋規則可能改變。
* 使用者可以回看當時為什麼推薦這張卡。
* 未來 debugging 需要。

### 17.3 確認交易時重新計算

使用者確認 pending transaction 時，必須根據實際資料重新計算：

* 實際卡片
* 實際金額
* 實際商家
* 實際日期
* 實際支付方式

不要直接套用原推薦結果。

### 17.4 作廢交易後重算

如果使用者作廢交易：

* 將 transaction.status 改為 voided。
* 重新計算該使用者該期間的 reward_pool_usages。

MVP 簡化方式：

* 找出該使用者該月份所有 confirmed transactions。
* 清空該月份 reward_pool_usages。
* 依照交易日期重新套用每筆交易。

### 17.5 一般消費 fallback

如果找不到商家專屬或類別規則：

* 使用 general rule。
* 若仍找不到，顯示沒有可用規則。

---

## 18. 錯誤處理

### 18.1 未登入

導向 `/login`。

### 18.2 沒有持有卡

顯示：

```text
你尚未新增持有的信用卡。請先新增卡片，系統才能根據你的卡片推薦。
```

導向 `/cards` 或 `/onboarding`。

### 18.3 找不到商家

顯示：

```text
找不到這個商家。你可以改用消費類別來估算。
```

提供類別 fallback：

* 網購
* 超商
* 餐飲
* 海外
* 一般消費

### 18.4 沒有符合規則

顯示：

```text
目前沒有找到這張卡在此通路的回饋規則。可先使用一般消費回饋估算，或改用其他卡。
```

### 18.5 高回饋池已封頂

顯示：

```text
這個高回饋池本期已封頂，系統已改用一般回饋或其他卡片估算。
```

---

## 19. 安全需求

### 19.1 不儲存敏感卡片資料

MVP 不得儲存：

* 完整信用卡卡號
* CVV
* 銀行帳號
* 銀行密碼
* 銀行登入憑證

可以選填：

* 卡片末四碼
* 卡片暱稱

### 19.2 必須啟用 RLS

所有使用者資料表必須啟用 RLS。

包含：

* profiles
* user_cards
* recommendations
* pending_transactions
* transactions
* reward_pool_usages

### 19.3 輸入驗證

必須驗證：

* amount > 0
* amount <= 10,000,000
* merchant 存在
* user_card 屬於目前使用者
* pending_transaction 屬於目前使用者
* transaction_date 是有效日期

### 19.4 不信任前端

即使是 MVP，也不能只靠前端隱藏資料。

所有資料讀寫必須受到 Supabase RLS 保護。

---

## 20. 測試計畫

### 20.1 單元測試

測試 reward-engine：

1. 無上限規則
2. eligible_spend cap
3. reward_amount cap
4. 部分封頂
5. 完全封頂
6. 超額部分套用 base reward
7. 需登錄規則
8. 需切權益規則
9. 活動已過期
10. 商家專屬規則優先於類別規則
11. 類別規則優先於一般規則

### 20.2 整合測試

測試流程：

1. 使用者登入。
2. 使用者新增持有卡。
3. 使用者輸入商家與金額。
4. 系統回傳推薦。
5. 使用者點選追蹤這筆。
6. 系統建立 pending transaction。
7. 使用者確認使用推薦卡。
8. 系統建立 transaction。
9. 系統更新 reward_pool_usages。

也要測：

* 改用其他卡
* 修改金額
* 沒有交易
* 手動新增交易
* 作廢交易後重算額度

### 20.3 RLS 測試

確保：

* User A 看不到 User B 的 user_cards。
* User A 看不到 User B 的 transactions。
* User A 不能更新 User B 的 pending_transactions。
* User A 不能讀取 User B 的 reward_pool_usages。

---

## 21. MVP 驗收標準

MVP 完成條件：

1. 使用者可以註冊與登入。
2. 使用者可以新增持有卡片。
3. 使用者可以輸入商家與金額。
4. 系統可以推薦使用者已持有卡片中的最佳卡。
5. 系統可以顯示預估回饋、有效回饋率、剩餘額度與注意事項。
6. 使用者可以建立 pending transaction。
7. 使用者可以確認 pending transaction。
8. confirmed transaction 會更新 reward_pool_usages。
9. 使用者可以手動新增交易。
10. 使用者可以查看回饋池儀表板。
11. 使用者資料受到 Supabase RLS 保護。
12. 手機瀏覽器可正常使用主要流程。
13. 可以部署到 Vercel。
14. Seed data 可展示完整流程。

---

## 22. Coding Agent 建置順序

### Step 1：建立專案

建立：

```text
Next.js + TypeScript + Tailwind CSS
```

安裝：

```text
@supabase/supabase-js
@supabase/ssr
```

設定：

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Step 2：建立 Supabase Schema

建立資料表：

* profiles
* cards
* user_cards
* merchants
* merchant_aliases
* reward_rules
* reward_pool_usages
* recommendations
* pending_transactions
* transactions

啟用 RLS。

建立 policies。

### Step 3：建立 Seed Data

建立 demo：

* cards
* merchants
* merchant_aliases
* reward_rules

### Step 4：登入流程

建立：

* /login
* Supabase Auth sign up
* Supabase Auth sign in
* sign out
* protected route

### Step 5：我的卡片

建立：

* /cards
* 顯示支援卡片
* 新增 user_card
* 停用 user_card

### Step 6：推薦引擎

建立：

* merchant resolver
* reward rule matcher
* reward calculator
* ranker

### Step 7：詢問頁

建立：

* /ask
* 商家輸入
* 金額輸入
* 支付方式選擇
* 顯示推薦結果
* 儲存 recommendation snapshot

### Step 8：待確認交易

建立：

* 建立 pending transaction
* /pending
* 確認使用推薦卡
* 確認使用其他卡
* 修改金額
* 沒有交易

### Step 9：交易與回饋池

建立：

* transactions table 操作
* reward_pool_usages 更新
* /transactions
* /reward-pools

### Step 10：PWA 與 UI 打磨

建立：

* manifest.json
* mobile bottom nav
* loading states
* empty states
* error states

---

## 23. 未來擴充

### 23.1 React Native App

未來可建立：

```text
apps/mobile
```

並共用：

```text
reward-engine
types
Supabase schema
```

### 23.2 Push Notification

未來可加入：

* Web Push
* Expo Push Notification
* LINE Bot reminder

### 23.3 消費習慣分析

根據 confirmed transactions 產生：

* 每月分類消費
* 平均回饋率
* 常封頂回饋池
* 錯失回饋

### 23.4 信用卡申辦推薦

根據近 90 天消費模擬：

* 目前卡組回饋
* 新增候選卡後回饋
* 每月多拿多少
* 每年多拿多少
* 管理複雜度

### 23.5 規則資料更新管線

未來建立：

* 官方頁監控
* 變更 diff
* LLM 草稿抽取
* 人工審核
* 規則版本發布

---

## 24. MVP 不可妥協原則

MVP 只專注一個閉環：

使用者詢問這筆刷哪張
→ 系統推薦
→ 使用者選擇追蹤
→ 使用者確認實際交易
→ 系統更新回饋池
→ 下一次推薦更準

在這個閉環穩定前，不要擴張到銀行同步、原生 App、信用卡申辦導流或自動爬蟲。
