-- 信用卡回饋助理 MVP - 初始 schema
-- 對應 SDD 第 9 章（資料庫設計）與第 10 章（Row Level Security）
-- 在 Supabase SQL Editor 直接執行，或透過 supabase CLI 套用。

-- =========================================================
-- Extensions
-- =========================================================
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- =========================================================
-- 9.1 profiles
-- =========================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  timezone text default 'Asia/Taipei',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =========================================================
-- 9.2 cards（全域）
-- =========================================================
create table if not exists cards (
  id uuid primary key default gen_random_uuid(),
  issuer text not null,
  name text not null,
  display_name text not null,
  card_type text default 'credit',
  is_active boolean default true,
  official_url text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (issuer, name)
);

-- =========================================================
-- 9.3 user_cards
-- =========================================================
create table if not exists user_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null references cards(id),
  nickname text,
  last4 text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists user_cards_user_id_idx on user_cards(user_id);
create index if not exists user_cards_card_id_idx on user_cards(card_id);

-- =========================================================
-- 9.4 merchants（全域）
-- =========================================================
create table if not exists merchants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  display_name text not null,
  category text not null,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =========================================================
-- 9.5 merchant_aliases（全域）
-- =========================================================
create table if not exists merchant_aliases (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  alias text not null,
  normalized_alias text not null,
  created_at timestamptz default now(),
  unique (normalized_alias)
);

-- =========================================================
-- 9.6 reward_rules（全域）
-- =========================================================
create table if not exists reward_rules (
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
);
create index if not exists reward_rules_card_id_idx on reward_rules(card_id);

-- =========================================================
-- 9.7 reward_pool_usages
-- =========================================================
create table if not exists reward_pool_usages (
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
  updated_at timestamptz default now(),
  unique (user_id, reward_rule_id, user_card_id, period_start, period_end)
);
create index if not exists reward_pool_usages_user_id_idx on reward_pool_usages(user_id);

-- =========================================================
-- 9.8 recommendations
-- =========================================================
create table if not exists recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  merchant_id uuid not null references merchants(id),
  amount numeric not null,
  payment_method text,
  transaction_date date not null default current_date,
  result_json jsonb not null,
  created_at timestamptz default now()
);
create index if not exists recommendations_user_id_idx on recommendations(user_id);

-- =========================================================
-- 9.9 pending_transactions
-- =========================================================
create table if not exists pending_transactions (
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
);
create index if not exists pending_transactions_user_id_idx on pending_transactions(user_id);

-- =========================================================
-- 9.10 transactions
-- =========================================================
create table if not exists transactions (
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
);
create index if not exists transactions_user_id_idx on transactions(user_id);

-- =========================================================
-- 10. Row Level Security
-- =========================================================

-- ---- profiles (10.1) ----
alter table profiles enable row level security;

create policy "Users can view own profile"
on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
on profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
on profiles for insert with check (auth.uid() = id);

-- ---- user_cards (10.2) ----
alter table user_cards enable row level security;

create policy "Users can view own user cards"
on user_cards for select using (auth.uid() = user_id);

create policy "Users can insert own user cards"
on user_cards for insert with check (auth.uid() = user_id);

create policy "Users can update own user cards"
on user_cards for update using (auth.uid() = user_id);

create policy "Users can delete own user cards"
on user_cards for delete using (auth.uid() = user_id);

-- ---- transactions (10.3) ----
alter table transactions enable row level security;

create policy "Users can view own transactions"
on transactions for select using (auth.uid() = user_id);

create policy "Users can insert own transactions"
on transactions for insert with check (auth.uid() = user_id);

create policy "Users can update own transactions"
on transactions for update using (auth.uid() = user_id);

create policy "Users can delete own transactions"
on transactions for delete using (auth.uid() = user_id);

-- ---- reward_pool_usages (10.4) ----
alter table reward_pool_usages enable row level security;

create policy "Users can view own reward pool usages"
on reward_pool_usages for select using (auth.uid() = user_id);

create policy "Users can insert own reward pool usages"
on reward_pool_usages for insert with check (auth.uid() = user_id);

create policy "Users can update own reward pool usages"
on reward_pool_usages for update using (auth.uid() = user_id);

create policy "Users can delete own reward pool usages"
on reward_pool_usages for delete using (auth.uid() = user_id);

-- ---- recommendations (10.4) ----
alter table recommendations enable row level security;

create policy "Users can view own recommendations"
on recommendations for select using (auth.uid() = user_id);

create policy "Users can insert own recommendations"
on recommendations for insert with check (auth.uid() = user_id);

create policy "Users can update own recommendations"
on recommendations for update using (auth.uid() = user_id);

create policy "Users can delete own recommendations"
on recommendations for delete using (auth.uid() = user_id);

-- ---- pending_transactions (10.4) ----
alter table pending_transactions enable row level security;

create policy "Users can view own pending transactions"
on pending_transactions for select using (auth.uid() = user_id);

create policy "Users can insert own pending transactions"
on pending_transactions for insert with check (auth.uid() = user_id);

create policy "Users can update own pending transactions"
on pending_transactions for update using (auth.uid() = user_id);

create policy "Users can delete own pending transactions"
on pending_transactions for delete using (auth.uid() = user_id);

-- ---- 全域資料表（10.5）：authenticated 可讀，不可寫 ----
alter table cards enable row level security;
alter table merchants enable row level security;
alter table merchant_aliases enable row level security;
alter table reward_rules enable row level security;

create policy "Authenticated can read cards"
on cards for select to authenticated using (true);

create policy "Authenticated can read merchants"
on merchants for select to authenticated using (true);

create policy "Authenticated can read merchant aliases"
on merchant_aliases for select to authenticated using (true);

create policy "Authenticated can read reward rules"
on reward_rules for select to authenticated using (true);

-- =========================================================
-- 自動建立 profile：使用者註冊後同步一筆 profile
-- =========================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
