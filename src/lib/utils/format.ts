// 顯示用格式化工具

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("zh-TW", {
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

// 0.045 -> "4.5%"
export function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(2).replace(/\.?0+$/, "")}%`;
}

export function todayISO(): string {
  // 以 Asia/Taipei 為基準的今天日期 (YYYY-MM-DD)
  const now = new Date();
  const tz = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return tz; // en-CA 產生 YYYY-MM-DD
}
