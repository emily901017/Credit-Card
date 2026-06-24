import { createBrowserClient } from "@supabase/ssr";

// 瀏覽器端 Supabase client（對應 SDD 13.1）
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
