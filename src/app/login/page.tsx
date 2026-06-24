"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/ask";

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    const supabase = createClient();

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        if (data.session) {
          router.push(redirectTo);
          router.refresh();
        } else {
          setInfo("註冊成功，請至信箱完成驗證後再登入。");
          setMode("signin");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push(redirectTo);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "發生未知錯誤");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold">信用卡回饋助理</h1>
        <p className="mt-2 text-sm text-gray-500">
          消費前先問一下，刷哪張最划算
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 rounded-lg bg-gray-100 p-1 text-sm">
        <button
          type="button"
          onClick={() => setMode("signin")}
          className={`rounded-md py-2 font-medium transition ${
            mode === "signin" ? "bg-white shadow" : "text-gray-500"
          }`}
        >
          登入
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`rounded-md py-2 font-medium transition ${
            mode === "signup" ? "bg-white shadow" : "text-gray-500"
          }`}
        >
          註冊
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-black focus:outline-none"
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="password">
            密碼
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-black focus:outline-none"
            placeholder="至少 6 碼"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}
        {info && (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            {info}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-black py-3 text-base font-semibold text-white disabled:opacity-50"
        >
          {loading ? "處理中…" : mode === "signin" ? "登入" : "註冊"}
        </button>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
