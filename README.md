# 信用卡回饋助理 MVP

手機優先的信用卡回饋推薦 Web App。消費前輸入商家與金額，系統依持有卡片、回饋規則與剩餘額度推薦最划算的信用卡。

技術：Next.js 16（App Router）+ React 19 + TypeScript + Tailwind CSS v4 + Supabase（Auth / Postgres / RLS）。

詳細設計見 [SDD.md](./SDD.md)。

## 已完成範圍（SDD 第 22 章 Step 1–10）

- **Step 1** 專案建置：Next.js + TS + Tailwind，安裝 `@supabase/supabase-js`、`@supabase/ssr`
- **Step 2** 資料庫 Schema：`supabase/migrations/0001_init.sql`（10 張表 + RLS + policies）
- **Step 3** Seed Data：`supabase/seed.sql`（5 卡 / 12 商家 / 別名 / 12 條規則涵蓋 8 種類型）
- **Step 4** 登入流程：`/login`（Email + 密碼註冊/登入/登出）、`src/proxy.ts` 保護路由
- **Step 5** 我的卡片：`/cards`（瀏覽、新增、停用/啟用持有卡）
- **Step 6** 推薦引擎：`src/lib/reward-engine/`（商家解析、規則匹配、回饋計算、排序）+ 單元測試
- **Step 7** 詢問頁：`/ask`（商家/金額/支付方式/日期輸入、顯示推薦結果、儲存推薦快照）
- **Step 8** 待確認交易：`/ask` 追蹤/我已刷完、`/pending`（確認使用推薦卡或其他卡、修改金額、沒有交易）
- **Step 9** 交易與回饋池：`/transactions`（手動新增、作廢）、`/reward-pools`（進度條儀表板），確認/作廢會重算回饋池（SDD 17.3/17.4）
- **Step 10** PWA 與 UI 打磨：`manifest.json` + icons、底部導覽、loading / empty / error states

至此完成 SDD 第 24 章的核心閉環：詢問 → 推薦 → 追蹤 → 確認 → 更新回饋池 → 下次推薦更準。

## 環境設定

1. 建立 Supabase 專案，取得 Project URL 與 anon key。
2. 複製環境變數範本並填入：

   ```bash
   cp .env.local.example .env.local
   # 編輯 .env.local，填入 NEXT_PUBLIC_SUPABASE_URL 與 NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```

3. 在 Supabase SQL Editor 依序執行：
   - `supabase/migrations/0001_init.sql`（建表 + RLS）
   - `supabase/seed.sql`（demo 資料）

## 本機開發

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # 執行 reward-engine 單元測試
npm run build      # 產線建置
```

## 專案結構

```
src/
  app/
    login/         登入頁
    ask/           推薦詢問頁（含 server action）
    cards/         我的卡片
    pending/ transactions/ reward-pools/   佔位頁（Step 8–9）
  components/      AppShell / BottomNav / AskClient / CardsManager / RecommendationCard …
  lib/
    supabase/      browser / server / proxy session client
    reward-engine/ 純 TypeScript 推薦引擎（可未來抽成共用 package）
    db/queries.ts  資料操作封裝
    utils/         normalize / format
  types/database.ts  資料庫型別
supabase/
  migrations/0001_init.sql
  seed.sql
```
