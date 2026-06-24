// 商家輸入正規化：對應 seed.sql 的 normalized_alias 規則
// 規則：去除頭尾空白、轉小寫、移除所有空白字元。
export function normalizeAlias(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, "");
}
