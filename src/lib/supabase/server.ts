import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// 伺服器端 Supabase client（Server Component / Route Handler 使用）
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // 在 Server Component 中呼叫 setAll 會丟錯，可忽略；
            // session 更新交由 middleware 處理。
          }
        },
      },
    },
  );
}
