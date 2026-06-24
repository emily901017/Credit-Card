-- 信用卡回饋助理 MVP - Seed Data
-- 對應 SDD 第 11 章。
-- 規則尚非官方驗證，verification_status 一律使用 'manual_verified_demo'。
-- 可重複執行（使用 on conflict / 先清除全域資料）。

-- ---------------------------------------------------------
-- 清除舊的全域 demo 資料（不影響使用者資料表）
-- ---------------------------------------------------------
truncate table reward_rules cascade;
truncate table merchant_aliases cascade;
truncate table merchants cascade;
truncate table cards cascade;

-- =========================================================
-- 11.1 Demo Cards（5 張）
-- =========================================================
insert into cards (issuer, name, display_name, official_url, notes) values
  ('玉山銀行', 'unicard',     '玉山 Unicard',   'https://www.esunbank.com.tw',   'demo 資料'),
  ('國泰世華', 'cube',        '國泰 CUBE 卡',   'https://www.cathaybk.com.tw',   'demo 資料'),
  ('台新銀行', 'richart',     '台新 @GoGo 卡',  'https://www.taishinbank.com.tw','demo 資料'),
  ('台北富邦', 'jcard',       '富邦 J 卡',      'https://www.fubon.com',         'demo 資料'),
  ('中國信託', 'linepay',     '中信 LINE Pay 卡','https://www.ctbcbank.com',     'demo 資料');

-- =========================================================
-- 11.2 Demo Merchants（12 個）
-- =========================================================
insert into merchants (name, display_name, category) values
  ('momo',       'momo購物網',  'online_shopping'),
  ('shopee',     '蝦皮購物',    'online_shopping'),
  ('pchome',     'PChome 24h',  'online_shopping'),
  ('amazon',     'Amazon',      'online_shopping'),
  ('seven',      '7-ELEVEN',    'convenience_store'),
  ('familymart', '全家 FamilyMart', 'convenience_store'),
  ('pxmart',     '全聯福利中心', 'grocery'),
  ('costco',     'Costco 好市多','grocery'),
  ('ubereats',   'Uber Eats',   'delivery'),
  ('foodpanda',  'foodpanda',   'delivery'),
  ('general',    '一般消費',    'general'),
  ('overseas',   '海外消費',    'overseas');

-- =========================================================
-- Merchant Aliases
-- normalized_alias = 小寫、去除空白
-- =========================================================
insert into merchant_aliases (merchant_id, alias, normalized_alias)
select m.id, v.alias, v.normalized_alias
from (values
  ('momo',       'momo',          'momo'),
  ('momo',       'momo購物網',     'momo購物網'),
  ('momo',       '富邦 momo',      '富邦momo'),
  ('momo',       'momo shopping', 'momoshopping'),
  ('shopee',     '蝦皮',          '蝦皮'),
  ('shopee',     '蝦皮購物',       '蝦皮購物'),
  ('shopee',     'shopee',        'shopee'),
  ('pchome',     'PChome',        'pchome'),
  ('pchome',     'PChome 24h',    'pchome24h'),
  ('pchome',     '網路家庭',       '網路家庭'),
  ('amazon',     'Amazon',        'amazon'),
  ('amazon',     '亞馬遜',         '亞馬遜'),
  ('seven',      '7-11',          '7-11'),
  ('seven',      '7-ELEVEN',      '7-eleven'),
  ('seven',      '小七',          '小七'),
  ('seven',      '統一超商',       '統一超商'),
  ('familymart', '全家',          '全家'),
  ('familymart', 'FamilyMart',    'familymart'),
  ('pxmart',     '全聯',          '全聯'),
  ('pxmart',     '全聯福利中心',    '全聯福利中心'),
  ('pxmart',     'PX Mart',       'pxmart'),
  ('costco',     'Costco',        'costco'),
  ('costco',     '好市多',         '好市多'),
  ('ubereats',   'Uber Eats',     'ubereats'),
  ('ubereats',   'ubereat',       'ubereat'),
  ('foodpanda',  'foodpanda',     'foodpanda'),
  ('foodpanda',  '熊貓',          '熊貓'),
  ('general',    '一般消費',       '一般消費'),
  ('overseas',   '海外',          '海外'),
  ('overseas',   '海外消費',       '海外消費')
) as v(merchant_name, alias, normalized_alias)
join merchants m on m.name = v.merchant_name;

-- =========================================================
-- 11.3 Demo Reward Rules（涵蓋 8 種規則類型）
-- =========================================================

-- (1) 無上限一般消費規則 — 中信 LINE Pay 卡，一般消費 1%
insert into reward_rules (
  card_id, name, description, merchant_scope_type, reward_type,
  reward_rate, base_reward_rate, cap_type, period_type, valid_from,
  priority, verification_status
)
select c.id, '一般消費 1% 無上限', '所有通路皆享 1% 回饋，無上限',
  'general', 'cashback', 0.01, 0.01, 'none', 'calendar_month', '2026-01-01',
  200, 'manual_verified_demo'
from cards c where c.name = 'linepay';

-- (2) 每月高回饋消費上限規則 — 玉山 Unicard 指定網購，eligible_spend cap
insert into reward_rules (
  card_id, name, description, merchant_scope_type, merchant_ids,
  reward_type, reward_rate, base_reward_rate, cap_type, eligible_spend_cap,
  period_type, valid_from, requires_registration,
  priority, verification_status
)
select c.id, '指定網購 4.5% 加碼', 'momo / 蝦皮 加碼 4.5%，每月高回饋消費上限 6,666 元',
  'merchant_list', array(select id from merchants where name in ('momo','shopee')),
  'cashback', 0.045, 0.005, 'eligible_spend', 6666,
  'calendar_month', '2026-01-01', true,
  50, 'manual_verified_demo'
from cards c where c.name = 'unicard';

-- (3) 回饋金額上限規則 — 富邦 J 卡 網購，reward_amount cap 300 點
insert into reward_rules (
  card_id, name, description, merchant_scope_type, category_scope,
  reward_type, reward_rate, base_reward_rate, cap_type, cap_value,
  period_type, valid_from,
  priority, verification_status
)
select c.id, '網購 3% 回饋（上限 300 點）', '網購類別 3%，每月回饋上限 300 點',
  'category', array['online_shopping'],
  'points', 0.03, 0.003, 'reward_amount', 300,
  'calendar_month', '2026-01-01',
  80, 'manual_verified_demo'
from cards c where c.name = 'jcard';

-- (4) 商家專屬規則 — 國泰 CUBE Costco 專屬 3%
insert into reward_rules (
  card_id, name, description, merchant_scope_type, merchant_ids,
  reward_type, reward_rate, base_reward_rate, cap_type, eligible_spend_cap,
  period_type, valid_from,
  priority, verification_status
)
select c.id, 'Costco 專屬 3%', 'Costco 消費享 3%，每月高回饋上限 30,000 元',
  'merchant_list', array(select id from merchants where name = 'costco'),
  'cashback', 0.03, 0.003, 'eligible_spend', 30000,
  'calendar_month', '2026-01-01',
  60, 'manual_verified_demo'
from cards c where c.name = 'cube';

-- (5) 類別規則 — 國泰 CUBE 餐飲/外送類別 3%（需切權益）
insert into reward_rules (
  card_id, name, description, merchant_scope_type, category_scope,
  reward_type, reward_rate, base_reward_rate, cap_type, eligible_spend_cap,
  period_type, valid_from, requires_benefit_switch,
  priority, verification_status
)
select c.id, '美食外送 3%（玩數位）', '外送類別 3%，需切換指定權益，每月高回饋上限 10,000 元',
  'category', array['delivery','dining'],
  'cashback', 0.03, 0.003, 'eligible_spend', 10000,
  'calendar_month', '2026-01-01', true,
  70, 'manual_verified_demo'
from cards c where c.name = 'cube';

-- (6) 需登錄規則 — 台新 @GoGo 指定數位通路 3%，需登錄
insert into reward_rules (
  card_id, name, description, merchant_scope_type, merchant_ids,
  reward_type, reward_rate, base_reward_rate, cap_type, cap_value,
  period_type, valid_from, requires_registration,
  priority, verification_status
)
select c.id, '指定通路 3.8%（需登錄）', 'momo / PChome 享 3.8%，需每月登錄，回饋上限 500 元',
  'merchant_list', array(select id from merchants where name in ('momo','pchome')),
  'cashback', 0.038, 0.003, 'reward_amount', 500,
  'calendar_month', '2026-01-01', true,
  55, 'manual_verified_demo'
from cards c where c.name = 'richart';

-- (7) 需切權益規則 — 玉山 Unicard 超商 2%（需切權益）
insert into reward_rules (
  card_id, name, description, merchant_scope_type, category_scope,
  reward_type, reward_rate, base_reward_rate, cap_type, eligible_spend_cap,
  period_type, valid_from, requires_benefit_switch,
  priority, verification_status
)
select c.id, '超商 2%（需切權益）', '超商類別 2%，需切換指定權益，每月高回饋上限 3,000 元',
  'category', array['convenience_store'],
  'cashback', 0.02, 0.005, 'eligible_spend', 3000,
  'calendar_month', '2026-01-01', true,
  90, 'manual_verified_demo'
from cards c where c.name = 'unicard';

-- (8) 活動期間規則 — 台新 @GoGo 海外 6 月活動 5%（campaign_period，需登錄+領券）
insert into reward_rules (
  card_id, name, description, merchant_scope_type,
  reward_type, reward_rate, base_reward_rate, cap_type, cap_value,
  period_type, valid_from, valid_to,
  requires_registration, requires_coupon,
  priority, verification_status
)
select c.id, '海外 5% 限時加碼', '2026/06 海外消費加碼 5%，需登錄並領券，活動期間回饋上限 600 元',
  'overseas', 'cashback', 0.05, 0.005, 'reward_amount', 600,
  'campaign_period', '2026-06-01', '2026-06-30',
  true, true,
  40, 'manual_verified_demo'
from cards c where c.name = 'richart';

-- 補充：富邦 J 卡 一般消費 0.7% 無上限（提供 fallback 多樣性）
insert into reward_rules (
  card_id, name, description, merchant_scope_type, reward_type,
  reward_rate, base_reward_rate, cap_type, period_type, valid_from,
  priority, verification_status
)
select c.id, '一般消費 0.7% 無上限', '所有通路 0.7% 回饋，無上限',
  'general', 'cashback', 0.007, 0.007, 'none', 'calendar_month', '2026-01-01',
  210, 'manual_verified_demo'
from cards c where c.name = 'jcard';

-- 補充：中信 LINE Pay 卡 海外一般 2.8%（一般海外）
insert into reward_rules (
  card_id, name, description, merchant_scope_type, reward_type,
  reward_rate, base_reward_rate, cap_type, period_type, valid_from,
  priority, verification_status
)
select c.id, '海外消費 2.8%', '海外消費 2.8% 回饋，無上限',
  'overseas', 'cashback', 0.028, 0.028, 'none', 'calendar_month', '2026-01-01',
  120, 'manual_verified_demo'
from cards c where c.name = 'linepay';
