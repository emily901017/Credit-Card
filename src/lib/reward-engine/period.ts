import type { EngineRewardRule } from "./types";

export type Period = {
  periodStart: string; // YYYY-MM-DD
  periodEnd: string; // YYYY-MM-DD
};

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function toISO(year: number, month1: number, day: number): string {
  return `${year}-${pad(month1)}-${pad(day)}`;
}

// 對應 SDD 12.4
// 以日期字串計算期間，避免時區造成的偏移（不使用 Date 的本地時間）。
export function computePeriod(
  rule: EngineRewardRule,
  transactionDate: string,
): Period {
  if (rule.periodType === "campaign_period") {
    // campaign_period：period_start = valid_from，period_end = valid_to
    return {
      periodStart: rule.validFrom,
      periodEnd: rule.validTo ?? rule.validFrom,
    };
  }

  // 預設與 calendar_month 相同：當月第一天 ~ 當月最後一天
  const [yStr, mStr] = transactionDate.split("-");
  const year = Number(yStr);
  const month1 = Number(mStr); // 1-based

  const firstDay = toISO(year, month1, 1);
  // 下個月第 0 天 = 當月最後一天
  const lastDayNum = new Date(Date.UTC(year, month1, 0)).getUTCDate();
  const lastDay = toISO(year, month1, lastDayNum);

  return { periodStart: firstDay, periodEnd: lastDay };
}
